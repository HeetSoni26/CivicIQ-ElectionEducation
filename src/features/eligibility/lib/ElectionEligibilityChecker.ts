/**
 * ElectionEligibilityChecker — Rule-based (no AI) eligibility engine
 * Covers 12 countries with complete rule sets
 * Used by the Voting Eligibility Checker feature
 */

import type {
  EligibilityInput,
  EligibilityResult,
  EligibilityReason,
} from "@civiciq/types";

// ─── Country Rule Sets ────────────────────────────────────────────────────────

interface CountryEligibilityRules {
  readonly votingAge: number;
  readonly citizenshipRequired: boolean;
  readonly residencyDaysRequired: number;
  readonly allowsFelons: boolean;
  readonly feloRestorationRequired: boolean;
  readonly registrationDeadlineDays: number;
  readonly mandatoryVoting: boolean;
  readonly registrationUrl: string;
  readonly officialSource: string;
}

const COUNTRY_RULES: Record<string, CountryEligibilityRules> = {
  US: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0, // Varies by state; 0 = no federal minimum
    allowsFelons: false, // Varies by state; most restrictive default
    feloRestorationRequired: true,
    registrationDeadlineDays: 30,
    mandatoryVoting: false,
    registrationUrl: "https://vote.gov/register",
    officialSource: "https://vote.gov",
  },
  CA: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: true,
    feloRestorationRequired: false,
    registrationDeadlineDays: 0,
    mandatoryVoting: false,
    registrationUrl: "https://elections.ca/registering",
    officialSource: "https://elections.ca",
  },
  GB: {
    votingAge: 18,
    citizenshipRequired: false, // British, Irish, and qualifying Commonwealth citizens
    residencyDaysRequired: 0,
    allowsFelons: false, // Felons cannot vote while imprisoned
    feloRestorationRequired: false, // Rights restored on release
    registrationDeadlineDays: 12,
    mandatoryVoting: false,
    registrationUrl: "https://www.gov.uk/register-to-vote",
    officialSource: "https://www.gov.uk/government/publications/your-vote-matters",
  },
  AU: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false, // Cannot vote while in prison for 3+ year sentence
    feloRestorationRequired: false, // Automatic on release for < 3-year sentences
    registrationDeadlineDays: 7,
    mandatoryVoting: true,
    registrationUrl: "https://www.aec.gov.au/enrol",
    officialSource: "https://www.aec.gov.au",
  },
  IN: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false,
    feloRestorationRequired: false,
    registrationDeadlineDays: 10,
    mandatoryVoting: false,
    registrationUrl: "https://voters.eci.gov.in",
    officialSource: "https://eci.gov.in",
  },
  DE: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: true,
    feloRestorationRequired: false,
    registrationDeadlineDays: 21,
    mandatoryVoting: false,
    registrationUrl: "https://www.bundeswahlbeauftragter.de",
    officialSource: "https://www.bundeswahlbeauftragter.de",
  },
  FR: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false, // Courts may suspend voting rights as a penalty
    feloRestorationRequired: true,
    registrationDeadlineDays: 30,
    mandatoryVoting: false,
    registrationUrl: "https://www.service-public.fr/particuliers/vosdroits/R45432",
    officialSource: "https://www.gouvernement.fr/participer/voter",
  },
  BR: {
    votingAge: 16, // Optional 16-17, compulsory 18-70, optional 70+
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false,
    feloRestorationRequired: true,
    registrationDeadlineDays: 151, // 5 months before election
    mandatoryVoting: true, // For 18-70
    registrationUrl: "https://www.tse.jus.br",
    officialSource: "https://www.tse.jus.br",
  },
  ZA: {
    votingAge: 18,
    citizenshipRequired: false, // Permanent residents cannot vote in national elections; only citizens can
    residencyDaysRequired: 0,
    allowsFelons: true, // Voting right preserved; exception: electoral offenses
    feloRestorationRequired: false,
    registrationDeadlineDays: 0, // Continuous registration
    mandatoryVoting: false,
    registrationUrl: "https://www.elections.org.za",
    officialSource: "https://www.elections.org.za",
  },
  JP: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 90, // 3 months in municipality
    allowsFelons: false,
    feloRestorationRequired: true,
    registrationDeadlineDays: 0, // Automatic via address registration
    mandatoryVoting: false,
    registrationUrl: "https://www.soumu.go.jp/senkyo",
    officialSource: "https://www.soumu.go.jp/senkyo",
  },
  MX: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false, // Suspended while serving sentence
    feloRestorationRequired: false,
    registrationDeadlineDays: 180, // 6 months before election
    mandatoryVoting: false, // Technically compulsory but not enforced
    registrationUrl: "https://www.ine.mx",
    officialSource: "https://www.ine.mx",
  },
  NG: {
    votingAge: 18,
    citizenshipRequired: true,
    residencyDaysRequired: 0,
    allowsFelons: false,
    feloRestorationRequired: false,
    registrationDeadlineDays: 30,
    mandatoryVoting: false,
    registrationUrl: "https://irev.inecnigeria.org",
    officialSource: "https://www.inecnigeria.org",
  },
};

// ─── ElectionEligibilityChecker ───────────────────────────────────────────────

export class ElectionEligibilityChecker {
  // ── Main eligibility check ───────────────────────────────────────────────

  check(input: EligibilityInput): EligibilityResult {
    this.validateInput(input);

    const rules = COUNTRY_RULES[input.countryCode];
    if (rules === undefined) {
      return {
        status: "check_required",
        reasons: [
          {
            passed: false,
            rule: "Country supported",
            explanation: `We don't have eligibility rules for ${input.countryCode} yet. Please check with your country's official electoral authority.`,
          },
        ],
        nextSteps: [
          "Contact your local electoral commission",
          "Check the International IDEA website at idea.int",
        ],
        checkRequired: true,
      };
    }

    const reasons: EligibilityReason[] = [];
    let hasDisqualifier = false;
    let requiresCheck = false;

    // 1. Age check
    const ageReason = this.checkAge(input, rules);
    reasons.push(ageReason);
    if (!ageReason.passed) hasDisqualifier = true;

    // 2. Citizenship check
    const citizenshipReason = this.checkCitizenship(input, rules);
    reasons.push(citizenshipReason);
    if (!citizenshipReason.passed) hasDisqualifier = true;

    // 3. Residency check (if applicable)
    if (rules.residencyDaysRequired > 0) {
      const residencyReason = this.checkResidency(input, rules);
      reasons.push(residencyReason);
      if (!residencyReason.passed) hasDisqualifier = true;
    }

    // 4. Felony disenfranchisement check (if applicable)
    if (input.hasFelon === true) {
      const felonyReason = this.checkFelony(input, rules);
      reasons.push(felonyReason);
      if (!felonyReason.passed && !rules.allowsFelons) hasDisqualifier = true;
      if (!felonyReason.passed && rules.feloRestorationRequired)
        requiresCheck = true;
    }

    // 5. Registration deadline check
    if (input.isRegistered === false) {
      const registrationReason = this.checkRegistrationDeadline(input, rules);
      reasons.push(registrationReason);
      if (!registrationReason.passed) requiresCheck = true;
    }

    // Determine final status
    let status: EligibilityResult["status"];
    if (hasDisqualifier) {
      status = "ineligible";
    } else if (requiresCheck) {
      status = "check_required";
    } else {
      status = "eligible";
    }

    return {
      status,
      reasons,
      nextSteps: this.buildNextSteps(status, rules, input),
      registrationUrl: rules.registrationUrl,
      checkRequired: requiresCheck || status === "check_required",
    };
  }

  // ── Age check ─────────────────────────────────────────────────────────────

  private checkAge(
    input: EligibilityInput,
    rules: CountryEligibilityRules
  ): EligibilityReason {
    const birthDate = new Date(input.birthDate);
    const electionDate = new Date(input.electionDate);
    const ageOnElectionDay = this.calculateAgeAt(birthDate, electionDate);
    const votingAge = rules.votingAge;
    const passed = ageOnElectionDay >= votingAge;

    // Brazil special case: 16-17 is optional
    if (input.countryCode === "BR" && ageOnElectionDay >= 16 && ageOnElectionDay < 18) {
      return {
        passed: true,
        rule: `Minimum voting age (${votingAge} compulsory, 16-17 optional)`,
        explanation: `You will be ${ageOnElectionDay} on election day. In Brazil, voting is optional for those aged 16-17 and compulsory for those aged 18-70.`,
      };
    }

    return {
      passed,
      rule: `Minimum voting age (${votingAge})`,
      explanation: passed
        ? `You will be ${ageOnElectionDay} years old on election day, which meets the minimum voting age of ${votingAge}.`
        : `You will be ${ageOnElectionDay} years old on election day. The minimum voting age in ${input.countryCode} is ${votingAge}.`,
    };
  }

  // ── Citizenship check ─────────────────────────────────────────────────────

  private checkCitizenship(
    input: EligibilityInput,
    rules: CountryEligibilityRules
  ): EligibilityReason {
    if (!rules.citizenshipRequired) {
      // UK: qualifying Commonwealth citizens may vote
      if (input.countryCode === "GB") {
        return {
          passed: true,
          rule: "Citizenship or Commonwealth status",
          explanation:
            "British citizens, Irish citizens, and qualifying Commonwealth citizens may vote in UK elections. Check gov.uk for full eligibility criteria.",
        };
      }
      return {
        passed: true,
        rule: "Citizenship requirement",
        explanation: "Citizenship is not required to vote in this instance.",
      };
    }

    const passed = input.isCitizen;

    // Check if citizenship was acquired before key deadline (where applicable)
    if (passed && input.citizenshipDate !== undefined) {
      const citizenshipDate = new Date(input.citizenshipDate);
      const electionDate = new Date(input.electionDate);
      if (citizenshipDate > electionDate) {
        return {
          passed: false,
          rule: "Citizenship must be acquired before election day",
          explanation:
            "Your citizenship date is after election day. You must be a citizen by election day to be eligible.",
        };
      }
    }

    return {
      passed,
      rule: "Citizenship requirement",
      explanation: passed
        ? "You have confirmed citizenship, which is required to vote."
        : `${input.countryCode} requires citizenship to vote in national elections. Non-citizens are not eligible.`,
    };
  }

  // ── Residency check ───────────────────────────────────────────────────────

  private checkResidency(
    input: EligibilityInput,
    rules: CountryEligibilityRules
  ): EligibilityReason {
    if (input.residencyStartDate === undefined) {
      return {
        passed: false,
        rule: `Residency requirement (${rules.residencyDaysRequired} days)`,
        explanation: `${input.countryCode} requires ${rules.residencyDaysRequired} days of residency. Please provide your residency start date.`,
      };
    }

    const residencyStart = new Date(input.residencyStartDate);
    const electionDate = new Date(input.electionDate);
    const residencyDays = Math.floor(
      (electionDate.getTime() - residencyStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const passed = residencyDays >= rules.residencyDaysRequired;

    return {
      passed,
      rule: `Residency requirement (${rules.residencyDaysRequired} days)`,
      explanation: passed
        ? `You will have lived in ${input.countryCode} for ${residencyDays} days by election day, which meets the ${rules.residencyDaysRequired}-day requirement.`
        : `You will have lived in ${input.countryCode} for only ${residencyDays} days by election day. The requirement is ${rules.residencyDaysRequired} days.`,
    };
  }

  // ── Felony check ──────────────────────────────────────────────────────────

  private checkFelony(
    input: EligibilityInput,
    rules: CountryEligibilityRules
  ): EligibilityReason {
    if (rules.allowsFelons) {
      return {
        passed: true,
        rule: "Criminal record restriction",
        explanation: `${input.countryCode} does not restrict voting rights based on criminal history (with some specific exceptions — verify with official authorities).`,
      };
    }

    if (!rules.feloRestorationRequired) {
      return {
        passed: false,
        rule: "Criminal record restriction",
        explanation: `Individuals with certain criminal convictions may not be eligible to vote in ${input.countryCode}. Rights may be restored upon release. Please check with your official electoral authority.`,
      };
    }

    // Check if rights restoration date has passed
    if (input.feloRestorationDate !== undefined) {
      const restorationDate = new Date(input.feloRestorationDate);
      const electionDate = new Date(input.electionDate);
      const restored = restorationDate <= electionDate;

      return {
        passed: restored,
        rule: "Criminal record — voting rights restoration",
        explanation: restored
          ? "Your voting rights appear to be restored. Verify with your state/local electoral authority before election day."
          : `Your voting rights restoration date is after election day. You may not be eligible for this election.`,
      };
    }

    return {
      passed: false,
      rule: "Criminal record restriction",
      explanation:
        "Individuals with certain felony convictions may be ineligible. Please check with your official electoral authority regarding your specific situation.",
    };
  }

  // ── Registration deadline check ───────────────────────────────────────────

  private checkRegistrationDeadline(
    input: EligibilityInput,
    rules: CountryEligibilityRules
  ): EligibilityReason {
    const electionDate = new Date(input.electionDate);
    const today = new Date();
    const deadline = new Date(electionDate);
    deadline.setDate(deadline.getDate() - rules.registrationDeadlineDays);

    if (rules.registrationDeadlineDays === 0) {
      return {
        passed: true,
        rule: "Voter registration",
        explanation:
          "Same-day or automatic registration is available. You can register at the polling station on election day.",
      };
    }

    const passed = today <= deadline;
    const daysRemaining = Math.floor(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      passed,
      rule: `Voter registration deadline (${rules.registrationDeadlineDays} days before election)`,
      explanation: passed
        ? `The registration deadline is ${deadline.toLocaleDateString()}. You have ${daysRemaining} days to register. Register at: ${rules.registrationUrl}`
        : `The registration deadline of ${deadline.toLocaleDateString()} has passed. You may not be able to vote in this election, but register now for future elections.`,
    };
  }

  // ── Next steps ────────────────────────────────────────────────────────────

  private buildNextSteps(
    status: EligibilityResult["status"],
    rules: CountryEligibilityRules,
    input: EligibilityInput
  ): string[] {
    switch (status) {
      case "eligible":
        return [
          input.isRegistered !== true
            ? `Register to vote at ${rules.registrationUrl}`
            : "Confirm your registration is up-to-date",
          "Find your polling location before election day",
          "Check what ID you need to bring",
          "Set a reminder for election day",
        ];
      case "ineligible":
        return [
          "Review the eligibility requirements with your official electoral authority",
          `Visit ${rules.officialSource} for official information`,
          "Contact your local electoral commission if you believe this assessment is incorrect",
        ];
      case "check_required":
        return [
          `Visit ${rules.officialSource} for definitive guidance`,
          "Contact your local electoral authority to verify your specific situation",
          rules.registrationDeadlineDays > 0
            ? `Register to vote now if you haven't — deadline: ${rules.registrationDeadlineDays} days before election`
            : "Register to vote — same-day registration may be available",
        ];
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private calculateAgeAt(birthDate: Date, asOf: Date): number {
    let age = asOf.getFullYear() - birthDate.getFullYear();
    const monthDiff = asOf.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && asOf.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  private validateInput(input: EligibilityInput): void {
    const birth = new Date(input.birthDate);
    const election = new Date(input.electionDate);

    if (isNaN(birth.getTime())) {
      throw new Error("Invalid birth date format");
    }
    if (isNaN(election.getTime())) {
      throw new Error("Invalid election date format");
    }
    if (birth >= new Date()) {
      throw new Error("Birth date cannot be in the future");
    }
    if (input.countryCode.length !== 2) {
      throw new Error("Country code must be ISO 3166-1 alpha-2 (2 letters)");
    }
  }

  // ── Static method for API usage ───────────────────────────────────────────

  static getSupportedCountries(): string[] {
    return Object.keys(COUNTRY_RULES);
  }

  static getCountryRules(
    countryCode: string
  ): CountryEligibilityRules | undefined {
    return COUNTRY_RULES[countryCode];
  }
}

export type { CountryEligibilityRules };
