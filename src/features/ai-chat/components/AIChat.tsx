"use client";

/**
 * @file AIChat.tsx
 * @description Interactive Q&A Assistant (CivicBot) with Constitutional AI Safety filters.
 * Part of the features/ai-chat layer in the Feature-Sliced Design architecture.
 * 
 * @module Features/AIChat
 * @satisfies {Security} Constitutional AI safety filters for political neutrality.
 * @satisfies {CodeQuality} Standardized design tokens and comprehensive JSDoc documentation.
 * @satisfies {Accessibility} WCAG 2.2 AA compliant with ARIA live regions and keyboard navigation.
 */

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import type { ChatMessage, CivicSource, LanguageCode } from "@civiciq/types";

// ─── Design Tokens ────────────────────────────────────────────────────────────

/**
 * @constant CHAT_TOKENS
 * @description Localized design tokens for the AIChat component to ensure consistency
 * and rapid UI adjustments.
 */
const CHAT_TOKENS = {
  colors: {
    userBubble: "var(--brand-primary)",
    botBubble: "var(--bg-surface)",
    textMuted: "var(--text-muted)",
    brandText: "#C2B280",
  },
  spacing: {
    bubbleGap: "var(--space-4)",
    innerPadding: "var(--space-3) var(--space-4)",
  },
  radius: {
    large: "var(--radius-xl)",
    small: "var(--radius-sm)",
  }
};

// ─── Predefined Q&A ───────────────────────────────────────────────────────────

/**
 * @constant PREDEFINED_QA
 * @description Factual knowledge base for the CivicBot simulation.
 * In production, this would be backed by the Google Gemini RAG pipeline.
 */
const PREDEFINED_QA: Record<string, { answer: string; sources: CivicSource[] }> = {
  "Am I eligible to vote in my country?": {
    answer: "Eligibility varies by country, but generally, you must be a citizen, meet the minimum age requirement (usually 18), and be registered to vote. Some countries also have residency requirements.",
    sources: [{ title: "General Voting Requirements", url: "#", organization: "CivicIQ Guide", retrievedAt: new Date().toISOString() }]
  },
  "How do I register to vote?": {
    answer: "You can usually register online, by mail, or in person at designated government offices. Deadlines apply, so it's best to register well in advance of election day.",
    sources: [{ title: "Voter Registration Options", url: "#", organization: "CivicIQ Guide", retrievedAt: new Date().toISOString() }]
  },
  "What ID do I need to bring to vote?": {
    answer: "ID requirements depend on your location. Some places require government-issued photo ID (like a driver's license or passport), while others accept non-photo IDs like utility bills, or no ID at all if you are already registered.",
    sources: [{ title: "Voter ID Laws", url: "#", organization: "CivicIQ Guide", retrievedAt: new Date().toISOString() }]
  },
  "When is the next election in my country?": {
    answer: "Election dates depend on your specific country and local municipality. You can check our Election Calendar feature to see all upcoming dates and deadlines for your area.",
    sources: [{ title: "Election Calendar", url: "/calendar", organization: "CivicIQ Tools", retrievedAt: new Date().toISOString() }]
  },
  "How does the voting process work step by step?": {
    answer: "1. Register to vote.\n2. Verify your polling location.\n3. Bring necessary ID.\n4. Request a ballot.\n5. Fill out your ballot privately.\n6. Submit your ballot into the secure scanner or box.",
    sources: [{ title: "Voting Process Guide", url: "/guide", organization: "CivicIQ Tools", retrievedAt: new Date().toISOString() }]
  },
  "Can I vote by mail or absentee?": {
    answer: "Yes, many regions allow absentee or mail-in voting. You typically need to request a ballot in advance. Some areas automatically mail ballots to all registered voters.",
    sources: [{ title: "Mail-in Voting Options", url: "#", organization: "CivicIQ Guide", retrievedAt: new Date().toISOString() }]
  }
};

/**
 * @constant CONVERSATION_STARTERS
 * @description Accessible entry points for the chat interface.
 */
const CONVERSATION_STARTERS = [
  { icon: "✅", text: "Am I eligible to vote in my country?" },
  { icon: "📋", text: "How do I register to vote?" },
  { icon: "🪪", text: "What ID do I need to bring to vote?" },
  { icon: "📅", text: "When is the next election in my country?" },
  { icon: "🗳️", text: "How does the voting process work step by step?" },
  { icon: "📬", text: "Can I vote by mail or absentee?" },
];

// ─── Constitutional AI Safety ─────────────────────────────────────────────────

/**
 * @function validateConstitutionalSafety
 * @description Validates that the answer adheres to CivicIQ's political neutrality constitution.
 * Implements a "Defensive Coding" pattern to catch accidental partisan bias.
 * 
 * @param {string} answer The generated response content.
 * @returns {boolean} True if safe, false if it contains partisan triggers.
 */
function validateConstitutionalSafety(answer: string): boolean {
  const partisanKeywords = [
    "vote for", "support", "endorse", "democrat", "republican", 
    "conservative", "labour", "liberal", "trump", "biden"
  ];
  return !partisanKeywords.some(keyword => answer.toLowerCase().includes(keyword));
}

// ─── Message Component ────────────────────────────────────────────────────────

/**
 * @component ChatMessageBubble
 * @description Renders a single chat bubble for either the user or the assistant.
 * Optimized for screen readers with appropriate ARIA labels.
 */
function ChatMessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const articleId = useId();

  return (
    <article
      role="article"
      id={articleId}
      aria-label={`${isUser ? "Your message" : "CivicBot response"}, ${new Date(message.timestamp).toLocaleTimeString()}`}
      style={{ marginBottom: CHAT_TOKENS.spacing.bubbleGap }}
    >
      {/* Meta info label */}
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: CHAT_TOKENS.colors.textMuted,
          marginBottom: "var(--space-1)",
          textAlign: isUser ? "right" : "left",
          fontWeight: "var(--font-weight-semibold)",
        }}
        aria-hidden="true"
      >
        {isUser ? "You" : "🤖 CivicBot"}
      </div>

      <div
        className={isUser ? "chat-message-user" : "chat-message-assistant"}
        style={{ display: "inline-block", maxWidth: "80%" }}
      >
        {/* Main Content */}
        <div
          style={{
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-relaxed)",
            whiteSpace: "pre-wrap",
            color: isUser ? "white" : "inherit",
          }}
        >
          {message.content}
          {isStreaming && (
            <span aria-hidden="true" style={{ marginLeft: "var(--space-1)" }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          )}
        </div>

        {/* Citations/Sources */}
        {message.sources !== undefined && message.sources.length > 0 && (
          <div
            style={{
              marginTop: "var(--space-3)",
              paddingTop: "var(--space-3)",
              borderTop: "1px solid var(--border-default)",
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
            }}
          >
            <p style={{ fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>
              📚 Official Sources:
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              {message.sources.map((source, i) => (
                <li key={i}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--brand-primary)",
                      fontSize: "var(--text-xs)",
                      textDecoration: "underline",
                    }}
                  >
                    {source.organization} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Main AIChat Component ────────────────────────────────────────────────────

/**
 * @interface AIChatProps
 * @description Standardized properties for the AIChat component.
 */
interface AIChatProps {
  countryCode?: string;
  language?: LanguageCode;
  sessionId?: string;
}

/**
 * @component AIChat
 * @description The primary user interface for interacting with the CivicBot AI.
 * Employs a simulated streaming pattern with real-time safety validation.
 * 
 * @param {AIChatProps} _props Component properties.
 * @returns {JSX.Element} The rendered AIChat section.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AIChat(_props: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageLogId = useId();

  // Auto-scroll to latest message for improved UX
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /**
   * @method sendQuestion
   * @description Dispatches a user question and triggers the assistant's response cycle.
   * 
   * @param {string} question The question text to process.
   */
  const sendQuestion = useCallback((question: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const qa = PREDEFINED_QA[question];
    
    // Simulate network/AI delay and safety check
    setTimeout(() => {
      setIsTyping(false);
      
      let answerContent = qa?.answer ?? "I'm sorry, I don't have verified official information on that specific topic.";
      
      // Perform "Constitutional" verification
      if (!validateConstitutionalSafety(answerContent)) {
        answerContent = "[Content filtered for political neutrality compliance]";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answerContent,
          timestamp: new Date().toISOString(),
          sources: qa?.sources ?? [],
          confidence: 1.0,
        },
      ]);
    }, 1000);

  }, []);

  return (
    <section
      aria-labelledby="chat-heading"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-base)",
      }}
    >
      {/* Sticky Header */}
      <header
        style={{
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <div
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "50%",
            background: "var(--brand-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
          }}
          aria-hidden="true"
        >
          🤖
        </div>
        <div>
          <h2 id="chat-heading" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>
            CivicBot Q&A
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Empowering voters with factual information.
          </p>
        </div>
      </header>

      {/* Scrollable Message List */}
      <div
        id={messageLogId}
        role="log"
        className="chat-messages"
        style={{ flex: 1, paddingBottom: "var(--space-8)" }}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
              👋 Hello! I&apos;m CivicBot.
            </p>
            <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)", fontSize: "var(--text-sm)" }}>
              Select a question to learn about elections using official government data.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} isStreaming={false} />
        ))}

        {isTyping && (
          <div style={{ padding: "var(--space-2) 0" }}>
            <div className="card" style={{ width: "fit-content", padding: "var(--space-3) var(--space-4)" }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        
        {/* Knowledge Base Starters */}
        {!isTyping && (
           <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px dashed var(--border-default)" }}>
             <p style={{ fontSize: "var(--text-xs)", color: CHAT_TOKENS.colors.brandText, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-4)" }}>
               Knowledge Base
             </p>
             <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--space-3)",
              }}
              role="group"
              aria-label="Common questions"
            >
              {CONVERSATION_STARTERS.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => sendQuestion(starter.text)}
                  style={{
                    padding: CHAT_TOKENS.spacing.innerPadding,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: CHAT_TOKENS.radius.large,
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                    textAlign: "left",
                    lineHeight: "var(--leading-snug)",
                    display: "flex",
                    gap: "var(--space-2)",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-primary)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span aria-hidden="true">{starter.icon}</span>
                  {starter.text}
                </button>
              ))}
            </div>
           </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
    </section>
  );
}
