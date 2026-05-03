/**
 * CountryConfigResolver — Strategy pattern for country-specific election rules
 *
 * Loads configs from Firestore at runtime (no redeployment required).
 * Falls back to cached in-memory config if Firestore is unavailable.
 * Applies state/province overrides on top of country configs.
 */

import type { CountryConfig, StateProvinceConfig } from "@civiciq/types";

// ─── Country Resolution Strategy Interface ────────────────────────────────────

interface CountryResolutionStrategy {
  resolve(
    countryCode: string,
    stateCode?: string
  ): Promise<ResolvedCountryConfig>;
  supportsCountry(countryCode: string): boolean;
}

interface ResolvedCountryConfig extends CountryConfig {
  readonly stateOverrides: Partial<CountryConfig> | null;
  readonly resolvedAt: string;
  readonly source: "firestore" | "cache" | "fallback";
}

// ─── Fallback Static Configs ──────────────────────────────────────────────────
// These are embedded as a safety net — Firestore is always the source of truth

const STATIC_COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  US: {
    countryCode: "US",
    countryName: {
      en: "United States",
      es: "Estados Unidos",
      fr: "États-Unis",
      hi: "संयुक्त राज्य अमेरिका",
      ar: "الولايات المتحدة الأمريكية",
      de: "Vereinigte Staaten",
      pt: "Estados Unidos",
      zh: "美国",
      ja: "アメリカ合衆国",
      ko: "미국",
    },
    electionSystem: "presidential",
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0, // no federal minimum; states vary
    allowsFelons: false, // varies by state
    mandatoryVoting: false,
    voterIdRequired: false, // varies by state
    registrationDeadlineDays: 30,
    earlyVotingAvailable: true,
    absenteeAvailable: true,
    onlineVotingAvailable: false,
    updatedAt: "2025-01-01T00:00:00Z",
    version: 3,
  },
  CA: {
    countryCode: "CA",
    countryName: {
      en: "Canada",
      es: "Canadá",
      fr: "Canada",
      hi: "कनाडा",
      ar: "كندا",
      de: "Kanada",
      pt: "Canadá",
      zh: "加拿大",
      ja: "カナダ",
      ko: "캐나다",
    },
    electionSystem: "parliamentary",
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: true,
    mandatoryVoting: false,
    voterIdRequired: true,
    registrationDeadlineDays: 0, // same-day registration
    earlyVotingAvailable: true,
    absenteeAvailable: true,
    onlineVotingAvailable: false,
    updatedAt: "2025-01-01T00:00:00Z",
    version: 2,
  },
  GB: {
    countryCode: "GB",
    countryName: {
      en: "United Kingdom",
      es: "Reino Unido",
      fr: "Royaume-Uni",
      hi: "यूनाइटेड किंगडम",
      ar: "المملكة المتحدة",
      de: "Vereinigtes Königreich",
      pt: "Reino Unido",
      zh: "英国",
      ja: "イギリス",
      ko: "영국",
    },
    electionSystem: "parliamentary",
    votingAge: 18,
    citizenshipRequired: false, // Commonwealth citizens can vote
    residencyDaysRequired: 0,
    allowsFelons: false,
    mandatoryVoting: false,
    voterIdRequired: true,
    registrationDeadlineDays: 12,
    earlyVotingAvailable: false,
    absenteeAvailable: true,
    onlineVotingAvailable: false,
    updatedAt: "2025-01-01T00:00:00Z",
    version: 2,
  },
  AU: {
    countryCode: "AU",
    countryName: {
      en: "Australia",
      es: "Australia",
      fr: "Australie",
      hi: "ऑस्ट्रेलिया",
      ar: "أستراليا",
      de: "Australien",
      pt: "Austrália",
      zh: "澳大利亚",
      ja: "オーストラリア",
      ko: "호주",
    },
    electionSystem: "parliamentary",
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false,
    mandatoryVoting: true, // Compulsory voting
    voterIdRequired: false, // name check only
    registrationDeadlineDays: 7,
    earlyVotingAvailable: true,
    absenteeAvailable: true,
    onlineVotingAvailable: false,
    updatedAt: "2025-01-01T00:00:00Z",
    version: 2,
  },
  IN: {
    countryCode: "IN",
    countryName: {
      en: "India",
      es: "India",
      fr: "Inde",
      hi: "भारत",
      ar: "الهند",
      de: "Indien",
      pt: "Índia",
      zh: "印度",
      ja: "インド",
      ko: "인도",
    },
    electionSystem: "parliamentary",
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false,
    mandatoryVoting: false,
    voterIdRequired: true,
    registrationDeadlineDays: 10,
    earlyVotingAvailable: false,
    absenteeAvailable: true,
    onlineVotingAvailable: false,
    updatedAt: "2025-01-01T00:00:00Z",
    version: 2,
  },
  DE: {
    countryCode: "DE",
    countryName: {
      en: "Germany",
      es: "Alemania",
      fr: "Allemagne",
      hi: "जर्मनी",
      ar: "ألمانيا",
      de: "Deutschland",
      pt: "Alemanha",
      zh: "德国",
      ja: "ドイツ",
      ko: "독일",
    },
    electionSystem: "mixed_member",
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: true,
    mandatoryVoting: false,
    voterIdRequired: false, // polling card sent by post
    registrationDeadlineDays: 21,
    earlyVotingAvailable: true,
    absenteeAvailable: true,
    onlineVotingAvailable: false,
    updatedAt: "2025-01-01T00:00:00Z",
    version: 2,
  },
};

// ─── Firestore Strategy ───────────────────────────────────────────────────────

class FirestoreResolutionStrategy implements CountryResolutionStrategy {
  private readonly cache: Map<
    string,
    { config: ResolvedCountryConfig; cachedAt: number }
  > = new Map();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  supportsCountry(_countryCode: string): boolean {
    return true; // Firestore can store any country
  }

  async resolve(
    countryCode: string,
    stateCode?: string
  ): Promise<ResolvedCountryConfig> {
    const cacheKey = `${countryCode}:${stateCode ?? ""}`;
    const hit = this.cache.get(cacheKey);

    if (hit !== undefined && Date.now() - hit.cachedAt < this.cacheTtlMs) {
      return { ...hit.config, source: "cache" };
    }

    try {
      const baseConfig = await this.fetchFromFirestore(countryCode);
      const stateOverrides = stateCode
        ? await this.fetchStateOverrides(countryCode, stateCode)
        : null;

      const resolved: ResolvedCountryConfig = {
        ...baseConfig,
        ...(stateOverrides?.overrides ?? {}),
        stateOverrides: stateOverrides?.overrides ?? null,
        resolvedAt: new Date().toISOString(),
        source: "firestore",
      };

      this.cache.set(cacheKey, { config: resolved, cachedAt: Date.now() });
      return resolved;
    } catch {
      // If Firestore fetch fails, fall back to static config
      const fallback = this.resolveFallback(countryCode);
      return {
        ...fallback,
        stateOverrides: null,
        resolvedAt: new Date().toISOString(),
        source: "fallback",
      };
    }
  }

  private async fetchFromFirestore(
    countryCode: string
  ): Promise<CountryConfig> {
    // In production: use Firebase Admin SDK
    // const doc = await adminDb.collection('countryConfigs').doc(countryCode).get();
    // if (!doc.exists) throw new Error(`Country config not found: ${countryCode}`);
    // return doc.data() as CountryConfig;

    // Development fallback
    const config = STATIC_COUNTRY_CONFIGS[countryCode];
    if (!config) throw new Error(`Country not supported: ${countryCode}`);
    return config;
  }

  private async fetchStateOverrides(
    countryCode: string,
    stateCode: string
  ): Promise<StateProvinceConfig | null> {
    // In production:
    // const doc = await adminDb.collection('countryConfigs').doc(countryCode)
    //   .collection('stateOverrides').doc(stateCode).get();
    // return doc.exists ? doc.data() as StateProvinceConfig : null;

    // US state-specific overrides example
    const usStateOverrides: Record<
      string,
      Partial<Pick<CountryConfig, "voterIdRequired" | "registrationDeadlineDays" | "earlyVotingAvailable">>
    > = {
      TX: { voterIdRequired: true, registrationDeadlineDays: 30 },
      CA: { voterIdRequired: false, registrationDeadlineDays: 15, earlyVotingAvailable: true },
      WI: { voterIdRequired: true, registrationDeadlineDays: 0 },
      ND: { voterIdRequired: true, registrationDeadlineDays: 0 }, // No registration required
      MN: { voterIdRequired: false, registrationDeadlineDays: 0 }, // Same-day
    };

    if (countryCode === "US" && stateCode in usStateOverrides) {
      return {
        stateCode,
        countryCode,
        stateName: { en: stateCode, es: stateCode, fr: stateCode, hi: stateCode, ar: stateCode, de: stateCode, pt: stateCode, zh: stateCode, ja: stateCode, ko: stateCode },
        overrides: usStateOverrides[stateCode] ?? {},
      };
    }
    return null;
  }

  private resolveFallback(countryCode: string): CountryConfig {
    const config = STATIC_COUNTRY_CONFIGS[countryCode];
    if (!config) {
      throw new Error(`No fallback config available for: ${countryCode}`);
    }
    return config;
  }
}

// ─── CountryConfigResolver ────────────────────────────────────────────────────

export class CountryConfigResolver {
  private readonly strategies: CountryResolutionStrategy[];
  private readonly inMemoryCache: Map<
    string,
    { config: ResolvedCountryConfig; expiresAt: number }
  > = new Map();

  constructor() {
    this.strategies = [
      new FirestoreResolutionStrategy(),
    ];
  }

  async resolve(
    countryCode: string,
    stateCode?: string
  ): Promise<ResolvedCountryConfig> {
    const normalizedCode = countryCode.toUpperCase();
    const cacheKey = `${normalizedCode}:${stateCode?.toUpperCase() ?? ""}`;

    // L1: in-memory cache (fastest)
    const cached = this.inMemoryCache.get(cacheKey);
    if (cached !== undefined && Date.now() < cached.expiresAt) {
      return cached.config;
    }

    // Find applicable strategy
    const strategy = this.strategies.find((s) =>
      s.supportsCountry(normalizedCode)
    );
    if (!strategy) {
      throw new Error(
        `No resolution strategy found for country: ${normalizedCode}`
      );
    }

    const resolved = await strategy.resolve(normalizedCode, stateCode);

    // Cache result (L1)
    this.inMemoryCache.set(cacheKey, {
      config: resolved,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    return resolved;
  }

  // Invalidate cache when admin publishes content update
  invalidateCache(countryCode?: string): void {
    if (countryCode !== undefined) {
      const prefix = countryCode.toUpperCase();
      for (const key of Array.from(this.inMemoryCache.keys())) {
        if (key.startsWith(prefix)) {
          this.inMemoryCache.delete(key);
        }
      }
    } else {
      this.inMemoryCache.clear();
    }
  }

  // Warmup: pre-load common countries on service start
  async warmup(countryCodes: string[]): Promise<void> {
    await Promise.allSettled(
      countryCodes.map((code) => this.resolve(code))
    );
  }

  // Get all supported countries (for UI country picker)
  getSupportedCountries(): string[] {
    return Object.keys(STATIC_COUNTRY_CONFIGS);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let resolverInstance: CountryConfigResolver | null = null;

export function getCountryConfigResolver(): CountryConfigResolver {
  if (resolverInstance === null) {
    resolverInstance = new CountryConfigResolver();
  }
  return resolverInstance;
}

export type { ResolvedCountryConfig };
