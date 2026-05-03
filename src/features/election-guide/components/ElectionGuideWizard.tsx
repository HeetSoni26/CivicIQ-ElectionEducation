"use client";

/**
 * ElectionGuideWizard — XState-powered multi-step voting guide
 * Steps: country_selection → eligibility_check → registration_guide →
 *        id_requirements → polling_location → voting_day_procedure → post_vote
 *
 * WCAG 2.2 AA compliant, keyboard navigable, screen-reader optimized.
 */

import { createMachine, assign } from "xstate";
import { useMachine } from "@xstate/react";
import type {
  WizardContext,
  WizardStep,
  EligibilityResult,
  LanguageCode,
  EligibilityInput,
} from "@civiciq/types";

// ─── State Machine Definition ─────────────────────────────────────────────────

type WizardEvent =
  | {
      type: "SELECT_COUNTRY";
      countryCode: string;
      stateCode?: string | undefined;
    }
  | { type: "ELIGIBILITY_COMPLETE"; result: EligibilityResult }
  | { type: "REGISTRATION_COMPLETE"; url: string; deadline: string }
  | { type: "ID_COMPLETE"; acceptedIds: string[] }
  | { type: "POLLING_COMPLETE"; findUrl: string; address?: string | undefined }
  | {
      type: "VOTING_DAY_COMPLETE";
      openTime: string;
      closeTime: string;
    }
  | { type: "POST_VOTE_COMPLETE"; resultDateEstimate: string }
  | { type: "GO_BACK" }
  | { type: "SET_LANGUAGE"; language: LanguageCode };

const initialWizardContext: WizardContext = {
  countryCode: "",
  selectedLanguage: "en",
  completedSteps: [],
  currentStep: "country_selection",
  stepData: {},
};

export const wizardMachine = createMachine(
  {
    id: "electionGuideWizard",
    initial: "country_selection",
    types: {} as {
      context: WizardContext;
      events: WizardEvent;
    },
    context: initialWizardContext,

    states: {
      country_selection: {
        on: {
          SELECT_COUNTRY: {
            target: "eligibility_check",
            actions: [
              assign({
                countryCode: ({ event }) => event.countryCode,
                stateCode: ({ event }) => event.stateCode,
                completedSteps: ({ context }) =>
                  markCompleted(context.completedSteps, "country_selection"),
                currentStep: () => "eligibility_check" as WizardStep,
              }),
            ],
          },
          SET_LANGUAGE: {
            actions: assign({
              selectedLanguage: ({ event }) => event.language,
            }),
          },
        },
      },

      eligibility_check: {
        on: {
          ELIGIBILITY_COMPLETE: {
            target: "registration_guide",
            actions: assign({
              eligibilityResult: ({ event }) => event.result,
              completedSteps: ({ context }) =>
                markCompleted(context.completedSteps, "eligibility_check"),
              currentStep: () => "registration_guide" as WizardStep,
            }),
          },
          GO_BACK: {
            target: "country_selection",
            actions: assign({
              currentStep: () => "country_selection" as WizardStep,
            }),
          },
          SET_LANGUAGE: {
            actions: assign({
              selectedLanguage: ({ event }) => event.language,
            }),
          },
        },
      },

      registration_guide: {
        on: {
          REGISTRATION_COMPLETE: {
            target: "id_requirements",
            actions: assign({
              stepData: ({ context, event }) => ({
                ...context.stepData,
                registration: {
                  registrationUrl: event.url,
                  deadline: event.deadline,
                },
              }),
              completedSteps: ({ context }) =>
                markCompleted(context.completedSteps, "registration_guide"),
              currentStep: () => "id_requirements" as WizardStep,
            }),
          },
          GO_BACK: {
            target: "eligibility_check",
            actions: assign({
              currentStep: () => "eligibility_check" as WizardStep,
            }),
          },
          SET_LANGUAGE: {
            actions: assign({
              selectedLanguage: ({ event }) => event.language,
            }),
          },
        },
      },

      id_requirements: {
        on: {
          ID_COMPLETE: {
            target: "polling_location",
            actions: assign({
              stepData: ({ context, event }) => ({
                ...context.stepData,
                idRequirements: { acceptedIds: event.acceptedIds },
              }),
              completedSteps: ({ context }) =>
                markCompleted(context.completedSteps, "id_requirements"),
              currentStep: () => "polling_location" as WizardStep,
            }),
          },
          GO_BACK: {
            target: "registration_guide",
            actions: assign({
              currentStep: () => "registration_guide" as WizardStep,
            }),
          },
          SET_LANGUAGE: {
            actions: assign({
              selectedLanguage: ({ event }) => event.language,
            }),
          },
        },
      },

      polling_location: {
        on: {
          POLLING_COMPLETE: {
            target: "voting_day_procedure",
            actions: assign({
              stepData: ({ context, event }) => ({
                ...context.stepData,
                pollingLocation: {
                  address: event.address ?? "",
                  findUrl: event.findUrl,
                },
              }),
              completedSteps: ({ context }) =>
                markCompleted(context.completedSteps, "polling_location"),
              currentStep: () => "voting_day_procedure" as WizardStep,
            }),
          },
          GO_BACK: {
            target: "id_requirements",
            actions: assign({
              currentStep: () => "id_requirements" as WizardStep,
            }),
          },
          SET_LANGUAGE: {
            actions: assign({
              selectedLanguage: ({ event }) => event.language,
            }),
          },
        },
      },

      voting_day_procedure: {
        on: {
          VOTING_DAY_COMPLETE: {
            target: "post_vote",
            actions: assign({
              stepData: ({ context, event }) => ({
                ...context.stepData,
                votingDay: {
                  openTime: event.openTime,
                  closeTime: event.closeTime,
                },
              }),
              completedSteps: ({ context }) =>
                markCompleted(
                  context.completedSteps,
                  "voting_day_procedure"
                ),
              currentStep: () => "post_vote" as WizardStep,
            }),
          },
          GO_BACK: {
            target: "polling_location",
            actions: assign({
              currentStep: () => "polling_location" as WizardStep,
            }),
          },
          SET_LANGUAGE: {
            actions: assign({
              selectedLanguage: ({ event }) => event.language,
            }),
          },
        },
      },

      post_vote: {
        type: "final",
        entry: assign({
          completedSteps: ({ context }) =>
            markCompleted(context.completedSteps, "post_vote"),
          currentStep: () => "post_vote" as WizardStep,
        }),
      },
    },
  }
);

// ─── Helper ───────────────────────────────────────────────────────────────────

function markCompleted(
  existing: WizardStep[],
  step: WizardStep
): WizardStep[] {
  if (existing.includes(step)) return existing;
  return [...existing, step];
}

// ─── Wizard Step Metadata ─────────────────────────────────────────────────────

export const WIZARD_STEPS: Array<{
  id: WizardStep;
  label: string;
  description: string;
  estimatedMinutes: number;
  icon: string;
}> = [
  {
    id: "country_selection",
    label: "Your Country",
    description: "Select your country and region",
    estimatedMinutes: 1,
    icon: "🌍",
  },
  {
    id: "eligibility_check",
    label: "Eligibility",
    description: "Check if you qualify to vote",
    estimatedMinutes: 2,
    icon: "✅",
  },
  {
    id: "registration_guide",
    label: "Registration",
    description: "How and when to register",
    estimatedMinutes: 3,
    icon: "📋",
  },
  {
    id: "id_requirements",
    label: "ID Requirements",
    description: "What identification you need",
    estimatedMinutes: 2,
    icon: "🪪",
  },
  {
    id: "polling_location",
    label: "Where to Vote",
    description: "Find your polling place",
    estimatedMinutes: 2,
    icon: "📍",
  },
  {
    id: "voting_day_procedure",
    label: "Voting Day",
    description: "Step-by-step on election day",
    estimatedMinutes: 4,
    icon: "🗳️",
  },
  {
    id: "post_vote",
    label: "After Voting",
    description: "What happens after you vote",
    estimatedMinutes: 2,
    icon: "🎉",
  },
];

// ─── Step Components ──────────────────────────────────────────────────────────

function CountrySelectionStep({
  onSelect,
}: {
  onSelect: (countryCode: string, stateCode?: string) => void;
}) {
  const countries = [
    { code: "US", name: "United States", flag: "🇺🇸", hasStates: true },
    { code: "CA", name: "Canada", flag: "🇨🇦", hasStates: true },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", hasStates: false },
    { code: "AU", name: "Australia", flag: "🇦🇺", hasStates: true },
    { code: "IN", name: "India", flag: "🇮🇳", hasStates: true },
    { code: "DE", name: "Germany", flag: "🇩🇪", hasStates: false },
    { code: "FR", name: "France", flag: "🇫🇷", hasStates: false },
    { code: "BR", name: "Brazil", flag: "🇧🇷", hasStates: true },
    { code: "ZA", name: "South Africa", flag: "🇿🇦", hasStates: false },
    { code: "JP", name: "Japan", flag: "🇯🇵", hasStates: false },
    { code: "MX", name: "Mexico", flag: "🇲🇽", hasStates: true },
    { code: "NG", name: "Nigeria", flag: "🇳🇬", hasStates: true },
  ];

  return (
    <div role="group" aria-labelledby="country-step-heading">
      <h2
        id="country-step-heading"
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-2)",
        }}
      >
        Where do you live?
      </h2>
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: "var(--space-6)",
        }}
      >
        We&apos;ll guide you through your country&apos;s specific election process and
        voting rules.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {countries.map((country) => (
          <button
            key={country.code}
            onClick={() => onSelect(country.code)}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              cursor: "pointer",
              textAlign: "left",
              padding: "var(--space-4)",
              transition: "all var(--transition-normal)",
              border: "2px solid var(--border-default)",
            }}
            aria-label={`Select ${country.name} as your country`}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-primary)";
              e.currentTarget.style.background = "var(--brand-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.background = "var(--bg-surface)";
            }}
          >
            <span style={{ fontSize: "2rem" }} aria-hidden="true">
              {country.flag}
            </span>
            <span style={{ fontWeight: "var(--font-weight-semibold)" }}>
              {country.name}
            </span>
          </button>
        ))}
      </div>
      <div
        className="alert alert-info"
        role="note"
        style={{ marginTop: "var(--space-4)" }}
      >
        <span aria-hidden="true">ℹ️</span>
        <span>
          Don&apos;t see your country?{" "}
          <a href="/contact" style={{ color: "inherit", fontWeight: "600" }}>
            Request it here
          </a>{" "}
          — we&apos;re adding more countries every month.
        </span>
      </div>
    </div>
  );
}

function EligibilityCheckStep({
  countryCode,
  onComplete,
  onBack,
}: {
  countryCode: string;
  onComplete: (result: EligibilityResult) => void;
  onBack: () => void;
}) {
  const [birthDate, setBirthDate] = React.useState("");
  const [isCitizen, setIsCitizen] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) {
      setError("Please enter your birth date.");
      return;
    }
    if (isCitizen === null) {
      setError("Please indicate your citizenship status.");
      return;
    }
    setError(null);

    // Rule-based eligibility check (no AI — reliable deterministic logic)
    const age = calculateAge(birthDate);
    const reasons: EligibilityResult["reasons"] = [];
    let status: EligibilityResult["status"] = "eligible";

    reasons.push({
      passed: age >= 18,
      rule: "Minimum voting age",
      explanation:
        age >= 18
          ? `You are ${age} years old, which meets the minimum voting age of 18.`
          : `You are ${age} years old. You must be at least 18 to vote in ${countryCode}.`,
    });

    reasons.push({
      passed: isCitizen,
      rule: "Citizenship requirement",
      explanation: isCitizen
        ? "You have confirmed you are a citizen."
        : "Most elections require citizenship. Check with your local electoral commission.",
    });

    if (reasons.some((r) => !r.passed)) {
      status = "ineligible";
    }

    onComplete({
      status,
      reasons,
      nextSteps:
        status === "eligible"
          ? [
              "Proceed to voter registration",
              "Confirm your polling location",
              "Set a reminder for election day",
            ]
          : ["Visit your local electoral authority for more information"],
      registrationUrl: `https://vote.gov`,
      checkRequired: false,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="eligibility-heading">
      <h2
        id="eligibility-heading"
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-2)",
        }}
      >
        Check Your Eligibility
      </h2>
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: "var(--space-6)",
        }}
      >
        Answer a few questions to see if you can vote in {countryCode}.
      </p>

      {error !== null && (
        <div
          className="alert alert-error"
          role="alert"
          aria-live="polite"
          style={{ marginBottom: "var(--space-4)" }}
        >
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div>
          <label
            htmlFor="birth-date"
            style={{
              display: "block",
              fontWeight: "var(--font-weight-semibold)",
              marginBottom: "var(--space-2)",
            }}
          >
            Date of Birth
          </label>
          <input
            type="date"
            id="birth-date"
            className="input-field"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            aria-required="true"
            aria-describedby="birth-date-hint"
          />
          <p
            id="birth-date-hint"
            style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}
          >
            Used only to determine if you meet the minimum voting age.
          </p>
        </div>

        <fieldset style={{ border: "none", padding: 0 }}>
          <legend
            style={{ fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}
          >
            Are you a citizen of {countryCode}?
          </legend>
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            {[
              { value: true, label: "Yes, I am a citizen" },
              { value: false, label: "No, I am not a citizen" },
            ].map(({ value, label }) => (
              <label
                key={String(value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  cursor: "pointer",
                  padding: "var(--space-3) var(--space-4)",
                  border: `2px solid ${isCitizen === value ? "var(--brand-primary)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-md)",
                  background: isCitizen === value ? "var(--brand-subtle)" : "transparent",
                  transition: "all var(--transition-fast)",
                }}
              >
                <input
                  type="radio"
                  name="citizenship"
                  value={String(value)}
                  checked={isCitizen === value}
                  onChange={() => setIsCitizen(value)}
                  style={{ accentColor: "var(--brand-primary)" }}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginTop: "var(--space-8)",
        }}
      >
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button type="submit" className="btn btn-primary">
          Check Eligibility →
        </button>
      </div>
    </form>
  );
}

function EligibilityResultDisplay({
  result,
  onContinue,
}: {
  result: EligibilityResult;
  onContinue: () => void;
}) {
  const isEligible = result.status === "eligible";

  return (
    <div aria-live="polite" aria-atomic="true">
      <div
        className={isEligible ? "alert alert-success" : "alert alert-error"}
        role="status"
        style={{ marginBottom: "var(--space-6)" }}
      >
        <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>
          {isEligible ? "✅" : "❌"}
        </span>
        <div>
          <strong style={{ fontSize: "var(--text-lg)" }}>
            {isEligible ? "You appear to be eligible to vote!" : "You may not be eligible to vote."}
          </strong>
          <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-sm)" }}>
            This is a general guide only. Always verify with your official electoral authority.
          </p>
        </div>
      </div>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        {result.reasons.map((reason, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
            <span aria-hidden="true" style={{ fontSize: "1.2rem", flexShrink: 0 }}>
              {reason.passed ? "✅" : "❌"}
            </span>
            <div>
              <strong style={{ display: "block", fontSize: "var(--text-sm)" }}>{reason.rule}</strong>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                {reason.explanation}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {isEligible && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue to Registration →
        </button>
      )}
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export function ElectionGuideWizard() {
  const [state, send] = useMachine(wizardMachine);
  const [eligibilityResult, setEligibilityResult] =
    React.useState<EligibilityResult | null>(null);

  const ctx = state.context;
  const totalEstimatedMinutes = WIZARD_STEPS.reduce(
    (sum, s) => sum + s.estimatedMinutes,
    0
  );
  const completedMinutes = WIZARD_STEPS.filter((s) =>
    ctx.completedSteps.includes(s.id)
  ).reduce((sum, s) => sum + s.estimatedMinutes, 0);

  const progressPct = Math.round(
    (ctx.completedSteps.length / WIZARD_STEPS.length) * 100
  );
  const currentStepIndex = WIZARD_STEPS.findIndex(
    (s) => s.id === ctx.currentStep
  );
  const currentStepMeta = WIZARD_STEPS[currentStepIndex];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "var(--space-8) 0",
      }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "var(--space-8)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginBottom: "var(--space-4)",
            }}
          >
            <span
              style={{
                fontSize: "1.5rem",
                background: "var(--brand-subtle)",
                padding: "var(--space-2)",
                borderRadius: "var(--radius-md)",
              }}
              aria-hidden="true"
            >
              🗳️
            </span>
            <h1
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--font-weight-bold)",
              }}
            >
              Election Guide Wizard
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            Estimated time: {totalEstimatedMinutes - completedMinutes} minutes
            remaining
          </p>

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Wizard progress: ${progressPct}% complete`}
          >
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                marginTop: "var(--space-1)",
              }}
            >
              Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
              {currentStepMeta !== undefined && ` — ${currentStepMeta.label}`}
            </p>
          </div>
        </div>

        {/* Stepper Navigation */}
        <nav aria-label="Wizard steps" style={{ marginBottom: "var(--space-8)" }}>
          <ol className="stepper" role="list">
            {WIZARD_STEPS.map((step, idx) => {
              const isCompleted = ctx.completedSteps.includes(step.id);
              const isActive = step.id === ctx.currentStep;
              return (
                <li
                  key={step.id}
                  className="stepper-item"
                  data-completed={isCompleted}
                  data-active={isActive}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="stepper-dot" aria-hidden="true">
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: isActive
                        ? "var(--font-weight-semibold)"
                        : "var(--font-weight-normal)",
                      color: isActive
                        ? "var(--brand-primary)"
                        : isCompleted
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                    }}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step Content */}
        <div className="card" style={{ padding: "var(--space-8)", maxWidth: "720px" }}>
          {state.matches("country_selection") && (
            <CountrySelectionStep
              onSelect={(code, stateCode) =>
                send({ type: "SELECT_COUNTRY", countryCode: code, stateCode })
              }
            />
          )}

          {state.matches("eligibility_check") && eligibilityResult === null && (
            <EligibilityCheckStep
              countryCode={ctx.countryCode}
              onComplete={(result) => {
                setEligibilityResult(result);
              }}
              onBack={() => send({ type: "GO_BACK" })}
            />
          )}

          {state.matches("eligibility_check") && eligibilityResult !== null && (
            <EligibilityResultDisplay
              result={eligibilityResult}
              onContinue={() => {
                send({
                  type: "ELIGIBILITY_COMPLETE",
                  result: eligibilityResult,
                });
                setEligibilityResult(null);
              }}
            />
          )}

          {state.matches("registration_guide") && (
            <RegistrationGuideStep
              countryCode={ctx.countryCode}
              onComplete={(url, deadline) =>
                send({ type: "REGISTRATION_COMPLETE", url, deadline })
              }
              onBack={() => send({ type: "GO_BACK" })}
            />
          )}

          {state.matches("id_requirements") && (
            <IdRequirementsStep
              countryCode={ctx.countryCode}
              onComplete={(ids) => send({ type: "ID_COMPLETE", acceptedIds: ids })}
              onBack={() => send({ type: "GO_BACK" })}
            />
          )}

          {state.matches("polling_location") && (
            <PollingLocationStep
              countryCode={ctx.countryCode}
              onComplete={(findUrl, address) =>
                send({ type: "POLLING_COMPLETE", findUrl, address })
              }
              onBack={() => send({ type: "GO_BACK" })}
            />
          )}

          {state.matches("voting_day_procedure") && (
            <VotingDayStep
              countryCode={ctx.countryCode}
              onComplete={(open, close) =>
                send({
                  type: "VOTING_DAY_COMPLETE",
                  openTime: open,
                  closeTime: close,
                })
              }
              onBack={() => send({ type: "GO_BACK" })}
            />
          )}

          {state.matches("post_vote") && (
            <PostVoteStep ctx={ctx} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Remaining Step Components ────────────────────────────────────────────────

function RegistrationGuideStep({
  countryCode,
  onComplete,
  onBack,
}: {
  countryCode: string;
  onComplete: (url: string, deadline: string) => void;
  onBack: () => void;
}) {
  const regData: Record<string, { url: string; deadline: string; steps: string[] }> = {
    US: {
      url: "https://vote.gov/register",
      deadline: "30 days before Election Day (varies by state)",
      steps: [
        "Visit vote.gov or your state's official registration site",
        "Provide your full legal name, date of birth, and home address",
        "Show proof of citizenship (driver's license, passport, or birth certificate)",
        "Submit your registration online, by mail, or in person",
        "Confirm your registration status before the election",
      ],
    },
    CA: {
      url: "https://elections.ca/registering",
      deadline: "Election day (same-day registration available at polls)",
      steps: [
        "Register online at elections.ca or by phone",
        "Provide your name, address, and date of birth",
        "Show one piece of ID with your name and address",
        "You can also register at the polling station on Election Day",
      ],
    },
    GB: {
      url: "https://www.gov.uk/register-to-vote",
      deadline: "12 working days before the election",
      steps: [
        "Register at gov.uk/register-to-vote",
        "Provide your National Insurance number and date of birth",
        "You'll receive confirmation by post",
      ],
    },
  };
  const data = regData[countryCode] ?? regData["US"]!;

  return (
    <div>
      <h2
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-2)",
        }}
      >
        How to Register to Vote
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
        Follow these steps to register in {countryCode}.
      </p>

      <div className="alert alert-warning" style={{ marginBottom: "var(--space-6)" }}>
        <span aria-hidden="true">📅</span>
        <div>
          <strong>Registration Deadline:</strong> {data.deadline}
        </div>
      </div>

      <ol
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          paddingInlineStart: "var(--space-6)",
        }}
      >
        {data.steps.map((step, i) => (
          <li key={i} style={{ lineHeight: "var(--leading-relaxed)" }}>
            {step}
          </li>
        ))}
      </ol>

      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-8)" }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          Open Registration Site ↗
        </a>
        <button
          className="btn btn-primary"
          onClick={() => onComplete(data.url, data.deadline)}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function IdRequirementsStep({
  countryCode,
  onComplete,
  onBack,
}: {
  countryCode: string;
  onComplete: (ids: string[]) => void;
  onBack: () => void;
}) {
  const idData: Record<string, string[]> = {
    US: ["Driver's License", "State ID Card", "U.S. Passport", "Military ID", "Tribal ID"],
    CA: ["Driver's License", "Passport", "Birth Certificate + one other document", "Certificate of Citizenship"],
    GB: ["Photo ID (Passport or Driving Licence)", "Blue badge", "Biometric immigration document"],
    AU: ["No ID required at polling station — your name is checked against the electoral roll"],
    IN: ["Voter ID Card (EPIC)", "Aadhaar card", "Driving licence", "Passport", "PAN card"],
  };
  const ids = idData[countryCode] ?? idData["US"]!;

  return (
    <div>
      <h2
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-2)",
        }}
      >
        Accepted Identification
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
        What ID you need to bring on Election Day in {countryCode}.
      </p>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {ids.map((id, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--bg-surface-alt)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
            }}
          >
            <span aria-hidden="true">🪪</span>
            {id}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-8)" }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={() => onComplete(ids)}>
          Continue →
        </button>
      </div>
    </div>
  );
}

function PollingLocationStep({
  countryCode,
  onComplete,
  onBack,
}: {
  countryCode: string;
  onComplete: (findUrl: string, address?: string) => void;
  onBack: () => void;
}) {
  const urls: Record<string, string> = {
    US: "https://www.vote.org/polling-place-locator/",
    CA: "https://www.elections.ca/",
    GB: "https://www.gov.uk/",
    AU: "https://www.aec.gov.au/",
    IN: "https://eci.gov.in/",
  };
  const findUrl = urls[countryCode] ?? "https://www.idea.int/";

  return (
    <div>
      <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
        Find Your Polling Place
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
        Locate your designated polling station before Election Day.
      </p>

      <div className="card" style={{ background: "var(--brand-subtle)", border: "2px solid var(--color-primary-200)" }}>
        <p style={{ fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
          🗺️ Official Polling Locator for {countryCode}
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
          Use the official government tool to find the polling station assigned to your address.
        </p>
        <a href={findUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
          Find My Polling Station ↗
        </a>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-8)" }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={() => onComplete(findUrl)}>
          I&apos;ve Found My Location →
        </button>
      </div>
    </div>
  );
}

function VotingDayStep({
  countryCode,
  onComplete,
  onBack,
}: {
  countryCode: string;
  onComplete: (openTime: string, closeTime: string) => void;
  onBack: () => void;
}) {
  const hoursData: Record<string, { open: string; close: string }> = {
    US: { open: "6:00 AM", close: "8:00 PM" },
    CA: { open: "7:30 AM", close: "9:30 PM" },
    GB: { open: "7:00 AM", close: "10:00 PM" },
    AU: { open: "8:00 AM", close: "6:00 PM" },
    IN: { open: "7:00 AM", close: "6:00 PM" },
  };
  const hours = hoursData[countryCode] ?? { open: "7:00 AM", close: "8:00 PM" };

  const steps = [
    { icon: "🏠", text: "Leave home with your ID and any required documents" },
    { icon: "📍", text: "Go to your assigned polling station" },
    { icon: "📋", text: "Give your name to the election official / check in at the register" },
    { icon: "📝", text: "Receive your ballot" },
    { icon: "🗳️", text: "Mark your ballot privately in the voting booth" },
    { icon: "✅", text: "Submit your completed ballot" },
    { icon: "🎉", text: "You&apos;ve voted! You may receive an &apos;I Voted&apos; sticker" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
        Voting Day — Step by Step
      </h2>

      <div className="alert alert-info" style={{ marginBottom: "var(--space-6)" }}>
        <span aria-hidden="true">⏰</span>
        <div>
          <strong>Polling Hours:</strong> {hours.open} – {hours.close}
          <br />
          <span style={{ fontSize: "var(--text-sm)", color: "inherit", opacity: 0.85 }}>
            Hours may vary by location. Arrive before closing — if you are in line when polls close, you are entitled to vote.
          </span>
        </div>
      </div>

      <ol style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", listStyle: "none" }}>
        {steps.map((step, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              background: "var(--bg-surface-alt)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <span
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: "var(--brand-primary)",
                color: "#C2B280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "var(--font-weight-bold)",
                fontSize: "var(--text-sm)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span style={{ paddingTop: "var(--space-1)" }}>
              {step.icon} {step.text}
            </span>
          </li>
        ))}
      </ol>

      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-8)" }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary"
          onClick={() => onComplete(hours.open, hours.close)}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function PostVoteStep({ ctx }: { ctx: WizardContext }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "4rem", marginBottom: "var(--space-4)" }} aria-hidden="true">
        🎉
      </div>
      <h2 style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--font-weight-extrabold)", marginBottom: "var(--space-3)" }}>
        You&apos;re Ready to Vote!
      </h2>
      <p style={{ color: "var(--text-secondary)", maxWidth: "55ch", margin: "0 auto var(--space-8)" }}>
        You&apos;ve completed the full voting guide for {ctx.countryCode}. Your civic participation
        makes democracy stronger.
      </p>

      <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={() => window.print()}
          aria-label="Print this guide for offline reference"
        >
          🖨️ Print This Guide
        </button>
        <a href="/quiz" className="btn btn-secondary">
          📝 Test Your Knowledge
        </a>
        <a href="/chat" className="btn btn-ghost">
          💬 Ask CivicBot a Question
        </a>
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// React import (required since we use JSX)
import React from "react";

// EligibilityInput used in form (imported for type completeness)
export type { EligibilityInput };
