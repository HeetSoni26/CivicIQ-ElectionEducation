/**
 * RAGPipeline — Retrieval-Augmented Generation for CivicIQ
 *
 * Strategy:
 * - 512-token chunks with 50-token overlap (sliding window)
 * - Cosine similarity threshold: 0.78
 * - Semantic cache: return cached answer if query similarity > 0.95
 * - Context window management: fit into 128K token limit
 *
 * GCP SDK: @google-cloud/aiplatform (Vertex AI)
 */

import type { DocumentChunk, RAGContext, CivicSource } from "@civiciq/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmbeddingResponse {
  readonly embeddings: Array<{ readonly values: number[] }>;
}

interface VectorSearchResult {
  readonly id: string;
  readonly distance: number; // 1 - cosine_similarity
  readonly metadata: Record<string, string>;
}

interface PipelineConfig {
  readonly projectId: string;
  readonly location: string;
  readonly indexEndpointId: string;
  readonly deployedIndexId: string;
  readonly chunkTokenSize: number;
  readonly chunkOverlapTokens: number;
  readonly similarityThreshold: number; // cosine > this passes
  readonly semanticCacheThreshold: number; // if similarity > this, use cache
  readonly maxContextTokens: number;
  readonly topK: number;
}

interface SemanticCacheEntry {
  readonly queryEmbedding: number[];
  readonly answer: string;
  readonly sources: CivicSource[];
  readonly createdAt: number;
  readonly ttlMs: number;
}

// ─── RAGPipeline ─────────────────────────────────────────────────────────────

export class RAGPipeline {
  private readonly config: PipelineConfig;
  private readonly semanticCache: Map<string, SemanticCacheEntry>;
  private readonly maxCacheEntries = 500;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.semanticCache = new Map();
  }

  // ── Public: process a user query through the full RAG pipeline ────────────

  async processQuery(
    query: string,
    countryCode: string,
    conversationTokenCount: number
  ): Promise<{
    context: RAGContext;
    prompt: string;
    cachedAnswer: string | null;
    sources: CivicSource[];
  }> {
    this.validateQuery(query);
    const queryEmbedding = await this.generateEmbedding(query);

    // 1. Check semantic cache
    const cached = this.checkSemanticCache(queryEmbedding);
    if (cached !== null) {
      return {
        context: this.buildEmptyContext(query),
        prompt: "",
        cachedAnswer: cached.answer,
        sources: cached.sources,
      };
    }

    // 2. Vector search
    const searchResults = await this.vectorSearch(
      queryEmbedding,
      countryCode,
      this.config.topK
    );

    // 3. Filter by similarity threshold (cosine > 0.78)
    const filtered = this.filterByThreshold(searchResults);

    // 4. Fetch chunk content
    const chunks = await this.fetchChunkContents(filtered);

    // 5. Fit within context window budget
    const remainingTokenBudget =
      this.config.maxContextTokens - conversationTokenCount - 2000; // reserve 2K for answer
    const fittedChunks = this.fitToContextWindow(chunks, remainingTokenBudget);

    // 6. Assemble context
    const context: RAGContext = {
      chunks: fittedChunks,
      totalTokens: fittedChunks.reduce((sum, c) => sum + c.tokenCount, 0),
      query,
      retrievedAt: new Date().toISOString(),
    };

    // 7. Build Gemini prompt
    const sources = this.extractSources(fittedChunks);
    const prompt = this.buildGeminiPrompt(query, context, countryCode);

    return { context, prompt, cachedAnswer: null, sources };
  }

  // ── Document Processing: chunk a raw document ─────────────────────────────

  chunkDocument(
    text: string,
    documentId: string,
    metadata: DocumentChunk["metadata"]
  ): DocumentChunk[] {
    const tokens = this.approximateTokenize(text);
    const chunkSize = this.config.chunkTokenSize;
    const overlap = this.config.chunkOverlapTokens;
    const step = chunkSize - overlap;

    const chunks: DocumentChunk[] = [];
    let i = 0;
    let chunkIndex = 0;

    while (i < tokens.length) {
      const chunkTokens = tokens.slice(i, i + chunkSize);
      const chunkText = chunkTokens.join(" ");
      const totalChunks = Math.ceil(
        (tokens.length - overlap) / step
      );

      chunks.push({
        chunkId: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        content: chunkText,
        tokenCount: chunkTokens.length,
        metadata: { ...metadata, chunkIndex, totalChunks },
      });

      i += step;
      chunkIndex++;

      // Safety: stop if we've generated too many chunks
      if (chunkIndex > 10000) break;
    }

    return chunks;
  }

  // ── Embedding Generation ──────────────────────────────────────────────────

  async generateEmbedding(text: string): Promise<number[]> {
    const endpoint = `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/text-embedding-004:predict`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await this.getAccessToken()}`,
      },
      body: JSON.stringify({
        instances: [{ content: text }],
        parameters: { outputDimensionality: 768 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      predictions: EmbeddingResponse["embeddings"];
    };
    const embedding = data.predictions[0];
    if (!embedding) {
      throw new Error("No embedding returned from Vertex AI");
    }
    return embedding.values;
  }

  // ── Semantic Cache ─────────────────────────────────────────────────────────

  cacheAnswer(
    queryEmbedding: number[],
    answer: string,
    sources: CivicSource[]
  ): void {
    // Evict oldest if at capacity
    if (this.semanticCache.size >= this.maxCacheEntries) {
      const oldest = Array.from(this.semanticCache.entries()).sort(
        ([, a], [, b]) => a.createdAt - b.createdAt
      )[0];
      if (oldest !== undefined) {
        this.semanticCache.delete(oldest[0]);
      }
    }

    const key = this.embeddingToKey(queryEmbedding);
    this.semanticCache.set(key, {
      queryEmbedding,
      answer,
      sources,
      createdAt: Date.now(),
      ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // ── Private: check semantic cache for similar queries ─────────────────────

  private checkSemanticCache(
    queryEmbedding: number[]
  ): SemanticCacheEntry | null {
    const now = Date.now();

    for (const entry of Array.from(this.semanticCache.values())) {
      // Evict expired
      if (now - entry.createdAt > entry.ttlMs) continue;

      const similarity = this.cosineSimilarity(
        queryEmbedding,
        entry.queryEmbedding
      );
      if (similarity >= this.config.semanticCacheThreshold) {
        return entry;
      }
    }
    return null;
  }

  // ── Private: vector search via Vertex AI Vector Search ────────────────────

  private async vectorSearch(
    embedding: number[],
    countryCode: string,
    topK: number
  ): Promise<VectorSearchResult[]> {
    const endpoint = `https://${this.config.location}-aiplatform.googleapis.com/v1/${this.config.indexEndpointId}:findNeighbors`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await this.getAccessToken()}`,
      },
      body: JSON.stringify({
        deployed_index_id: this.config.deployedIndexId,
        queries: [
          {
            datapoint: {
              datapoint_id: "query",
              feature_vector: embedding,
              restricts: [
                {
                  namespace: "countryCode",
                  allow_list: [countryCode, "GLOBAL"],
                },
              ],
            },
            neighbor_count: topK,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vector search error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      nearestNeighbors: Array<{
        neighbors: Array<{
          datapoint: { datapointId: string; crowdingTag?: unknown };
          distance: number;
        }>;
      }>;
    };

    const neighbors = data.nearestNeighbors[0]?.neighbors ?? [];
    return neighbors.map((n) => ({
      id: n.datapoint.datapointId,
      distance: n.distance,
      metadata: {},
    }));
  }

  // ── Private: filter by cosine similarity threshold ────────────────────────

  private filterByThreshold(
    results: VectorSearchResult[]
  ): VectorSearchResult[] {
    // Vertex AI returns L2 distance; convert to cosine: cosine = 1 - (distance²/2)
    // For normalized vectors: cosine_similarity = 1 - distance (since distance = sqrt(2*(1-cosine)))
    const threshold = this.config.similarityThreshold;
    return results.filter((r) => {
      const cosine = 1 - r.distance * r.distance * 0.5; // approximate for unit vectors
      return cosine >= threshold;
    });
  }

  // ── Private: fetch chunk text from Firestore ──────────────────────────────
  // In production this calls Firestore via the admin SDK
  private async fetchChunkContents(
    results: VectorSearchResult[]
  ): Promise<DocumentChunk[]> {
    // Batch fetch by chunk IDs
    const batches: DocumentChunk[] = await Promise.all(
      results.map(async (result): Promise<DocumentChunk> => {
        // Simulated fetch — replace with actual Firestore admin SDK call
        return {
          chunkId: result.id,
          documentId: result.id.split("_chunk_")[0] ?? result.id,
          content: `[Civic content chunk ${result.id}]`,
          tokenCount: 512,
          metadata: {
            countryCode: "US",
            sourceUrl: "https://vote.gov",
            chunkIndex: 0,
            totalChunks: 1,
          },
        };
      })
    );
    return batches;
  }

  // ── Private: fit chunks within token budget ───────────────────────────────

  private fitToContextWindow(
    chunks: DocumentChunk[],
    tokenBudget: number
  ): DocumentChunk[] {
    const fitted: DocumentChunk[] = [];
    let used = 0;

    for (const chunk of chunks) {
      if (used + chunk.tokenCount > tokenBudget) break;
      fitted.push(chunk);
      used += chunk.tokenCount;
    }

    return fitted;
  }

  // ── Private: assemble Gemini prompt with RAG context ─────────────────────

  private buildGeminiPrompt(
    query: string,
    context: RAGContext,
    countryCode: string
  ): string {
    const contextText = context.chunks
      .map(
        (c, i) =>
          `[Source ${i + 1} — ${c.metadata.sourceUrl}]\n${c.content}`
      )
      .join("\n\n---\n\n");

    return `You are CivicBot, a civic education assistant. Use ONLY the following official sources to answer the question.
Country context: ${countryCode}
Retrieved date: ${context.retrievedAt}

--- OFFICIAL SOURCES ---
${contextText}
--- END SOURCES ---

USER QUESTION: ${query}

Instructions:
1. Answer using ONLY information from the sources above.
2. If the sources do not contain the answer, say: "I don't have official information on this topic. Please visit your country's official electoral authority."
3. Cite the specific source URL for every factual claim.
4. Use plain language at Grade 6-8 reading level.
5. Do not express opinions, name candidates, or favor any political party.
6. Format your response as: {"answer": "...", "sources": [...], "confidence": 0.0-1.0}`;
  }

  // ── Private: extract sources from chunks ─────────────────────────────────

  private extractSources(chunks: DocumentChunk[]): CivicSource[] {
    const seen = new Set<string>();
    return chunks
      .filter((c) => {
        if (seen.has(c.metadata.sourceUrl)) return false;
        seen.add(c.metadata.sourceUrl);
        return true;
      })
      .map((c) => ({
        title: `Official Electoral Information — ${c.metadata.countryCode}`,
        url: c.metadata.sourceUrl,
        organization: "Official Electoral Authority",
        retrievedAt: new Date().toISOString(),
      }));
  }

  // ── Private: cosine similarity ────────────────────────────────────────────

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dot += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ── Private: approximate tokenization (BPE approximation) ────────────────

  private approximateTokenize(text: string): string[] {
    // Approximate: split on whitespace (1 token ≈ 0.75 words on average)
    // In production, use the tiktoken library for accurate Gemini tokenization
    return text
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w.length > 0);
  }

  // ── Private: convert embedding to cache key ───────────────────────────────

  private embeddingToKey(embedding: number[]): string {
    // Quantize to 2 decimal places for fuzzy key matching
    return embedding
      .slice(0, 16) // use first 16 dimensions for key
      .map((v) => v.toFixed(2))
      .join(",");
  }

  // ── Private: get GCP access token ────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    // In production: use google-auth-library with Application Default Credentials
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
      throw new Error("Failed to obtain GCP access token");
    }
    return tokenResponse.token;
  }

  // ── Private: empty context helper ────────────────────────────────────────

  private buildEmptyContext(query: string): RAGContext {
    return {
      chunks: [],
      totalTokens: 0,
      query,
      retrievedAt: new Date().toISOString(),
    };
  }

  // ── Private: input validation ─────────────────────────────────────────────

  private validateQuery(query: string): void {
    if (query.length === 0) throw new Error("Query cannot be empty");
    if (query.length > 2000) throw new Error("Query exceeds 2000 character limit");

    // Prompt injection detection patterns
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /you\s+are\s+now\s+a/i,
      /act\s+as\s+(if\s+you\s+are\s+)?a/i,
      /forget\s+(your\s+)?(training|instructions|rules)/i,
      /jailbreak/i,
      /DAN\s+mode/i,
      /system\s+prompt/i,
      /override\s+(your\s+)?(safety|guidelines)/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(query)) {
        throw new Error("PROMPT_INJECTION_DETECTED");
      }
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createRAGPipeline(projectId: string): RAGPipeline {
  return new RAGPipeline({
    projectId,
    location: "us-central1",
    indexEndpointId: `projects/${projectId}/locations/us-central1/indexEndpoints/civic-knowledge-endpoint`,
    deployedIndexId: "civic-knowledge-deployed",
    chunkTokenSize: 512,
    chunkOverlapTokens: 50,
    similarityThreshold: 0.78,
    semanticCacheThreshold: 0.95,
    maxContextTokens: 128000,
    topK: 10,
  });
}
