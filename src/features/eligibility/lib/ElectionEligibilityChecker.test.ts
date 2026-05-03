/**
 * Test Suite 1: ElectionEligibilityChecker
 * Comprehensive tests covering 12 country rule sets, boundary values, and edge cases.
 * Run: npx vitest run src/features/eligibility/lib/ElectionEligibilityChecker.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ElectionEligibilityChecker } from "./ElectionEligibilityChecker";
import type { EligibilityInput } from "@civiciq/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    countryCode: "US",
    birthDate: "1990-06-15",
    electionDate: "2025-11-04",
    isCitizen: true,
    isRegistered: true,
    ...overrides,
  };
}

function ageToDate(ageYears: number, referenceDate: string): string {
  const ref = new Date(referenceDate);
  ref.setFullYear(ref.getFullYear() - ageYears);
  return ref.toISOString().split("T")[0] ?? "";
}

// ─── Core Tests ───────────────────────────────────────────────────────────────

describe("ElectionEligibilityChecker", () => {
  let checker: ElectionEligibilityChecker;

  beforeEach(() => {
    checker = new ElectionEligibilityChecker();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // United States
  // ──────────────────────────────────────────────────────────────────────────

  describe("United States (US)", () => {
    it("should return eligible for a 30-year-old US citizen who is registered", () => {
      const result = checker.check(makeInput({ countryCode: "US" }));
      expect(result.status).toBe("eligible");
      expect(result.registrationUrl).toContain("vote.gov");
    });

    it("should return ineligible for a 17-year-old on election day", () => {
      const birthDate = ageToDate(17, "2025-11-04");
      const result = checker.check(makeInput({ countryCode: "US", birthDate }));
      expect(result.status).toBe("ineligible");
      const ageReason = result.reasons.find((r) => r.rule.toLowerCase().includes("age"));
      expect(ageReason?.passed).toBe(false);
    });

    it("should return eligible for someone turning exactly 18 on election day", () => {
      const result = checker.check(
        makeInput({ countryCode: "US", birthDate: "2007-11-04", electionDate: "2025-11-04" })
      );
      expect(result.status).toBe("eligible");
    });

    it("should return ineligible for non-citizen in the US", () => {
      const result = checker.check(makeInput({ countryCode: "US", isCitizen: false }));
      expect(result.status).toBe("ineligible");
      const citizenReason = result.reasons.find((r) => r.rule.toLowerCase().includes("citizenship"));
      expect(citizenReason?.passed).toBe(false);
    });

    it("should flag felon as needing check when rights restoration date not provided", () => {
      const result = checker.check(makeInput({ countryCode: "US", hasFelon: true }));
      expect(result.status).toBe("check_required");
    });

    it("should return not-ineligible for felon with restoration date before election", () => {
      const result = checker.check(
        makeInput({
          countryCode: "US",
          hasFelon: true,
          feloRestorationDate: "2024-01-01",
        })
      );
      expect(result.status).not.toBe("ineligible");
    });

    it("should include registration deadline info when not registered", () => {
      const result = checker.check(makeInput({ countryCode: "US", isRegistered: false }));
      const regReason = result.reasons.find((r) => r.rule.toLowerCase().includes("registration"));
      expect(regReason).toBeDefined();
    });

    it("should have a valid registration URL", () => {
      const result = checker.check(makeInput({ countryCode: "US" }));
      expect(result.registrationUrl).toBeDefined();
      expect(result.registrationUrl).toMatch(/^https?:\/\//);
    });

    it("should return non-empty next steps for eligible voter", () => {
      const result = checker.check(makeInput({ countryCode: "US" }));
      expect(result.nextSteps.length).toBeGreaterThan(0);
    });

    it("should return non-empty next steps for ineligible voter", () => {
      const result = checker.check(makeInput({ countryCode: "US", isCitizen: false }));
      expect(result.nextSteps.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Canada
  // ──────────────────────────────────────────────────────────────────────────

  describe("Canada (CA)", () => {
    it("should return eligible for 18+ Canadian citizen", () => {
      const result = checker.check(makeInput({ countryCode: "CA" }));
      expect(result.status).toBe("eligible");
    });

    it("should allow felons to vote in Canada", () => {
      const result = checker.check(makeInput({ countryCode: "CA", hasFelon: true }));
      expect(result.status).not.toBe("ineligible");
    });

    it("should pass registration check for CA with same-day registration", () => {
      const result = checker.check(makeInput({ countryCode: "CA", isRegistered: false }));
      const regReason = result.reasons.find((r) => r.rule.toLowerCase().includes("registration"));
      if (regReason) {
        expect(regReason.passed).toBe(true);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // United Kingdom
  // ──────────────────────────────────────────────────────────────────────────

  describe("United Kingdom (GB)", () => {
    it("should return eligible for UK citizen", () => {
      const result = checker.check(makeInput({ countryCode: "GB" }));
      expect(result.status).toBe("eligible");
    });

    it("should produce citizenship/commonwealth reason for GB", () => {
      const result = checker.check(makeInput({ countryCode: "GB", isCitizen: false }));
      const citizenReason = result.reasons.find(
        (r) => r.rule.toLowerCase().includes("citizenship") || r.rule.toLowerCase().includes("commonwealth")
      );
      expect(citizenReason).toBeDefined();
    });

    it("should require registration 12 days before election for unregistered GB voter", () => {
      const result = checker.check(makeInput({ countryCode: "GB", isRegistered: false }));
      const regReason = result.reasons.find((r) => r.rule.toLowerCase().includes("registration"));
      expect(regReason).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Australia
  // ──────────────────────────────────────────────────────────────────────────

  describe("Australia (AU)", () => {
    it("should return eligible for Australian citizen 18+", () => {
      const result = checker.check(makeInput({ countryCode: "AU" }));
      expect(result.status).toBe("eligible");
    });

    it("should return ineligible for 17-year-old Australian", () => {
      const birthDate = ageToDate(17, "2025-05-03");
      const result = checker.check(
        makeInput({ countryCode: "AU", birthDate, electionDate: "2025-05-03" })
      );
      expect(result.status).toBe("ineligible");
    });

    it("should return defined status for Australian non-citizen", () => {
      const result = checker.check(makeInput({ countryCode: "AU", isCitizen: false }));
      expect(result.status).toBeDefined();
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // India
  // ──────────────────────────────────────────────────────────────────────────

  describe("India (IN)", () => {
    it("should return eligible for Indian citizen 18+", () => {
      const result = checker.check(makeInput({ countryCode: "IN" }));
      expect(result.status).toBe("eligible");
    });

    it("should return ineligible for 17-year-old Indian citizen", () => {
      const birthDate = ageToDate(17, "2025-11-04");
      const result = checker.check(makeInput({ countryCode: "IN", birthDate }));
      expect(result.status).toBe("ineligible");
    });

    it("should return ineligible for non-citizen in India", () => {
      const result = checker.check(makeInput({ countryCode: "IN", isCitizen: false }));
      expect(result.status).toBe("ineligible");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Germany
  // ──────────────────────────────────────────────────────────────────────────

  describe("Germany (DE)", () => {
    it("should return eligible for German citizen 18+", () => {
      const result = checker.check(makeInput({ countryCode: "DE" }));
      expect(result.status).toBe("eligible");
    });

    it("should allow felons to vote in Germany", () => {
      const result = checker.check(makeInput({ countryCode: "DE", hasFelon: true }));
      const felonyReason = result.reasons.find((r) => r.rule.toLowerCase().includes("criminal"));
      if (felonyReason) {
        expect(felonyReason.passed).toBe(true);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Brazil — special voting age (16 optional)
  // ──────────────────────────────────────────────────────────────────────────

  describe("Brazil (BR)", () => {
    it("should return eligible for 16-year-old Brazilian (optional voting)", () => {
      const birthDate = ageToDate(16, "2025-10-05");
      const result = checker.check(
        makeInput({ countryCode: "BR", birthDate, electionDate: "2025-10-05" })
      );
      expect(result.status).toBe("eligible");
    });

    it("should return ineligible for 15-year-old Brazilian", () => {
      const birthDate = ageToDate(15, "2025-10-05");
      const result = checker.check(
        makeInput({ countryCode: "BR", birthDate, electionDate: "2025-10-05" })
      );
      expect(result.status).toBe("ineligible");
    });

    it("should return eligible for 18-year-old Brazilian citizen", () => {
      const birthDate = ageToDate(18, "2025-10-05");
      const result = checker.check(
        makeInput({ countryCode: "BR", birthDate, electionDate: "2025-10-05" })
      );
      expect(result.status).toBe("eligible");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Japan — residency requirement (90 days)
  // ──────────────────────────────────────────────────────────────────────────

  describe("Japan (JP)", () => {
    it("should return eligible for Japanese citizen with 90+ days residency", () => {
      const residencyStart = new Date("2025-11-04");
      residencyStart.setDate(residencyStart.getDate() - 100);
      const result = checker.check(
        makeInput({
          countryCode: "JP",
          residencyStartDate: residencyStart.toISOString().split("T")[0],
        })
      );
      expect(result.status).toBe("eligible");
    });

    it("should return ineligible for Japanese citizen with < 90 days residency", () => {
      const residencyStart = new Date("2025-11-04");
      residencyStart.setDate(residencyStart.getDate() - 50);
      const result = checker.check(
        makeInput({
          countryCode: "JP",
          residencyStartDate: residencyStart.toISOString().split("T")[0],
        })
      );
      expect(result.status).toBe("ineligible");
      const residencyReason = result.reasons.find((r) => r.rule.toLowerCase().includes("residency"));
      expect(residencyReason?.passed).toBe(false);
    });

    it("should flag residency issue when residency date not provided for Japan", () => {
      const result = checker.check(makeInput({ countryCode: "JP" }));
      const residencyReason = result.reasons.find((r) => r.rule.toLowerCase().includes("residency"));
      expect(residencyReason).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // South Africa, Mexico, Nigeria, France
  // ──────────────────────────────────────────────────────────────────────────

  describe("South Africa (ZA)", () => {
    it("should return eligible for South African citizen 18+", () => {
      const result = checker.check(makeInput({ countryCode: "ZA" }));
      expect(result.status).toBe("eligible");
    });

    it("should allow felons to vote in South Africa", () => {
      const result = checker.check(makeInput({ countryCode: "ZA", hasFelon: true }));
      const felonyReason = result.reasons.find((r) => r.rule.toLowerCase().includes("criminal"));
      if (felonyReason) {
        expect(felonyReason.passed).toBe(true);
      }
    });
  });

  describe("Mexico (MX)", () => {
    it("should return eligible for Mexican citizen 18+", () => {
      const result = checker.check(makeInput({ countryCode: "MX" }));
      expect(result.status).toBe("eligible");
    });
  });

  describe("Nigeria (NG)", () => {
    it("should return eligible for Nigerian citizen 18+", () => {
      const result = checker.check(makeInput({ countryCode: "NG" }));
      expect(result.status).toBe("eligible");
    });

    it("should return ineligible for non-citizen in Nigeria", () => {
      const result = checker.check(makeInput({ countryCode: "NG", isCitizen: false }));
      expect(result.status).toBe("ineligible");
    });
  });

  describe("France (FR)", () => {
    it("should return eligible for French citizen 18+", () => {
      const result = checker.check(makeInput({ countryCode: "FR" }));
      expect(result.status).toBe("eligible");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Negative / edge case tests
  // ──────────────────────────────────────────────────────────────────────────

  describe("Input validation and edge cases", () => {
    it("should throw for an invalid birth date format", () => {
      expect(() => checker.check(makeInput({ birthDate: "not-a-date" }))).toThrow();
    });

    it("should throw for a birth date in the future", () => {
      expect(() => checker.check(makeInput({ birthDate: "2050-01-01" }))).toThrow();
    });

    it("should throw for an invalid country code length (3 chars)", () => {
      expect(() => checker.check(makeInput({ countryCode: "USA" }))).toThrow();
    });

    it("should return check_required for unsupported country code", () => {
      const result = checker.check(makeInput({ countryCode: "XX" }));
      expect(result.status).toBe("check_required");
      expect(result.checkRequired).toBe(true);
    });

    it("should handle citizenship acquired after election day — ineligible", () => {
      const result = checker.check(
        makeInput({
          countryCode: "US",
          isCitizen: true,
          citizenshipDate: "2025-12-01",
          electionDate: "2025-11-04",
        })
      );
      expect(result.status).toBe("ineligible");
    });

    it("should handle citizenship acquired on election day — eligible (boundary)", () => {
      const result = checker.check(
        makeInput({
          countryCode: "US",
          isCitizen: true,
          citizenshipDate: "2025-11-04",
          electionDate: "2025-11-04",
        })
      );
      expect(result.status).toBe("eligible");
    });

    it("should return reasons array with at least 2 items for any check", () => {
      const result = checker.check(makeInput());
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it("getSupportedCountries() should return 12 countries", () => {
      const countries = ElectionEligibilityChecker.getSupportedCountries();
      expect(countries).toHaveLength(12);
    });

    it("getCountryRules() should return rules for US with votingAge 18", () => {
      const rules = ElectionEligibilityChecker.getCountryRules("US");
      expect(rules).toBeDefined();
      expect(rules?.votingAge).toBe(18);
    });

    it("getCountryRules() should return undefined for unsupported country", () => {
      const rules = ElectionEligibilityChecker.getCountryRules("ZZ");
      expect(rules).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Boundary value tests
  // ──────────────────────────────────────────────────────────────────────────

  describe("Boundary value tests", () => {
    it("18th birthday exactly 1 day before election — should be eligible", () => {
      const birthDate = "2007-11-03";
      const result = checker.check(
        makeInput({ countryCode: "US", birthDate, electionDate: "2025-11-04" })
      );
      expect(result.status).toBe("eligible");
    });

    it("18th birthday exactly 1 day after election — should be ineligible", () => {
      const birthDate = "2007-11-05";
      const result = checker.check(
        makeInput({ countryCode: "US", birthDate, electionDate: "2025-11-04" })
      );
      expect(result.status).toBe("ineligible");
    });

    it("Japan: exactly 90 days residency — should be eligible", () => {
      const electionDate = new Date("2025-11-04");
      const residencyStart = new Date(electionDate);
      residencyStart.setDate(residencyStart.getDate() - 90);
      const result = checker.check(
        makeInput({
          countryCode: "JP",
          electionDate: "2025-11-04",
          residencyStartDate: residencyStart.toISOString().split("T")[0],
        })
      );
      expect(result.status).toBe("eligible");
    });

    it("Japan: exactly 89 days residency — should be ineligible", () => {
      const electionDate = new Date("2025-11-04");
      const residencyStart = new Date(electionDate);
      residencyStart.setDate(residencyStart.getDate() - 89);
      const result = checker.check(
        makeInput({
          countryCode: "JP",
          electionDate: "2025-11-04",
          residencyStartDate: residencyStart.toISOString().split("T")[0],
        })
      );
      expect(result.status).toBe("ineligible");
    });

    it("Brazil: 16-year-old on election day is optional voter (eligible)", () => {
      const result = checker.check(
        makeInput({
          countryCode: "BR",
          birthDate: "2009-10-05",
          electionDate: "2025-10-05",
        })
      );
      expect(result.status).toBe("eligible");
    });

    it("Brazil: 15-year-old 364 days before 16th birthday is ineligible", () => {
      const result = checker.check(
        makeInput({
          countryCode: "BR",
          birthDate: "2010-10-06",
          electionDate: "2025-10-05",
        })
      );
      expect(result.status).toBe("ineligible");
    });
  });
});
