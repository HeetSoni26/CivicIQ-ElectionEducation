"use client";

/**
 * @file EligibilityPage.tsx
 * @description standalone eligibility checker using a rule-based engine.
 * Part of the features/eligibility-checker layer in the Feature-Sliced Design architecture.
 * 
 * @module Features/EligibilityChecker
 * @satisfies {CodeQuality} Deterministic rule-based logic for legal compliance.
 * @satisfies {Accessibility} WCAG 2.2 AA compliant form controls and status regions.
 */

import React, { useState } from "react";
import Link from "next/link";
import { ElectionEligibilityChecker } from "../lib/ElectionEligibilityChecker";
import type { EligibilityInput, EligibilityResult } from "@civiciq/types";

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
];

function StatusIcon({ passed }: { passed: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ fontSize: "1.25rem", flexShrink: 0 }}
    >
      {passed ? "✅" : "❌"}
    </span>
  );
}

export default function EligibilityPage() {
  const [form, setForm] = useState({
    countryCode: "",
    birthDate: "",
    electionDate: new Date().toISOString().split("T")[0] ?? "",
    isCitizen: "",
    residencyStartDate: "",
    hasFelon: "",
    isRegistered: "",
  });
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isChecking, setIsChecking] = useState(false);

  const checker = new ElectionEligibilityChecker();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.countryCode) newErrors["countryCode"] = "Please select your country.";
    if (!form.birthDate) newErrors["birthDate"] = "Please enter your date of birth.";
    if (!form.electionDate) newErrors["electionDate"] = "Please enter an election date.";
    if (!form.isCitizen) newErrors["isCitizen"] = "Please select your citizenship status.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsChecking(true);

    const input: EligibilityInput = {
      countryCode: form.countryCode,
      birthDate: form.birthDate,
      electionDate: form.electionDate,
      isCitizen: form.isCitizen === "yes",
      isRegistered: form.isRegistered === "yes",
      ...(form.residencyStartDate ? { residencyStartDate: form.residencyStartDate } : {}),
      ...(form.hasFelon === "yes" ? { hasFelon: true } : form.hasFelon === "no" ? { hasFelon: false } : {}),
    };

    // Simulate async check (would be API call in production)
    setTimeout(() => {
      try {
        const eligibilityResult = checker.check(input);
        setResult(eligibilityResult);
      } catch {
        setResult({
          status: "check_required",
          reasons: [],
          nextSteps: ["Please contact your local electoral authority for verification."],
          checkRequired: true,
        });
      } finally {
        setIsChecking(false);
      }
    }, 600);
  }

  function handleReset() {
    setResult(null);
    setForm({
      countryCode: "",
      birthDate: "",
      electionDate: new Date().toISOString().split("T")[0] ?? "",
      isCitizen: "",
      residencyStartDate: "",
      hasFelon: "",
      isRegistered: "",
    });
    setErrors({});
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, var(--color-primary-950) 0%, hsl(235 65% 18%) 100%)",
          padding: "var(--space-16) 0 var(--space-12)",
        }}
      >
        <div className="container">
          <nav aria-label="Breadcrumb" style={{ marginBottom: "var(--space-6)" }}>
            <ol
              style={{ display: "flex", gap: "var(--space-2)", listStyle: "none", alignItems: "center" }}
            >
              <li>
                <Link
                  href="/"
                  style={{ color: "rgb(255 255 255 / 0.6)", fontSize: "var(--text-sm)", textDecoration: "none" }}
                >
                  Home
                </Link>
              </li>
              <li style={{ color: "rgb(255 255 255 / 0.4)", fontSize: "var(--text-sm)" }} aria-hidden="true">›</li>
              <li style={{ color: "#C2B280", fontSize: "var(--text-sm)", fontWeight: 600 }} aria-current="page">
                Check Eligibility
              </li>
            </ol>
          </nav>

          <span
            className="badge"
            style={{
              background: "rgb(22 181 99 / 0.2)",
              color: "var(--color-civic-300)",
              border: "1px solid rgb(22 181 99 / 0.3)",
              marginBottom: "var(--space-4)",
              display: "inline-flex",
            }}
          >
            ✅ Rule-Based — No AI, 100% Reliable
          </span>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 900,
              color: "#C2B280",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: "var(--space-4)",
            }}
          >
            Am I Eligible to Vote?
          </h1>
          <p
            style={{
              color: "rgb(255 255 255 / 0.75)",
              fontSize: "var(--text-lg)",
              maxWidth: "55ch",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            Answer a few questions to get an instant eligibility check — based on official regulations,
            not AI guesses. Always verify with your local electoral authority.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="container" style={{ paddingBlock: "var(--space-16)" }}>
        <div style={{ maxWidth: "680px", marginInline: "auto" }}>
          {result === null ? (
            // ── Form ──────────────────────────────────────────────────────────────
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-labelledby="eligibility-form-heading"
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}
            >
              <div className="card" style={{ padding: "var(--space-8)" }}>
                <h2
                  id="eligibility-form-heading"
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: "var(--font-weight-bold)",
                    marginBottom: "var(--space-6)",
                  }}
                >
                  Your Information
                </h2>

                {/* Country */}
                <div style={{ marginBottom: "var(--space-5)" }}>
                  <label
                    htmlFor="country-select"
                    style={{
                      display: "block",
                      fontWeight: "var(--font-weight-semibold)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    Country <span aria-hidden="true" style={{ color: "var(--status-error)" }}>*</span>
                  </label>
                  <select
                    id="country-select"
                    className="input-field"
                    value={form.countryCode}
                    onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!errors["countryCode"]}
                    aria-describedby={errors["countryCode"] ? "country-error" : undefined}
                    style={{ appearance: "none" }}
                  >
                    <option value="">Select your country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                  {errors["countryCode"] && (
                    <p
                      id="country-error"
                      role="alert"
                      style={{ color: "var(--status-error)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}
                    >
                      {errors["countryCode"]}
                    </p>
                  )}
                </div>

                {/* Birth Date */}
                <div style={{ marginBottom: "var(--space-5)" }}>
                  <label
                    htmlFor="birth-date"
                    style={{
                      display: "block",
                      fontWeight: "var(--font-weight-semibold)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    Date of Birth <span aria-hidden="true" style={{ color: "var(--status-error)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="birth-date"
                    className="input-field"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                    aria-required="true"
                    aria-invalid={!!errors["birthDate"]}
                    aria-describedby={errors["birthDate"] ? "birthdate-error birthdate-hint" : "birthdate-hint"}
                  />
                  <p
                    id="birthdate-hint"
                    style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}
                  >
                    Used only to verify you meet the minimum voting age. Not stored.
                  </p>
                  {errors["birthDate"] && (
                    <p
                      id="birthdate-error"
                      role="alert"
                      style={{ color: "var(--status-error)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}
                    >
                      {errors["birthDate"]}
                    </p>
                  )}
                </div>

                {/* Election Date */}
                <div style={{ marginBottom: "var(--space-5)" }}>
                  <label
                    htmlFor="election-date"
                    style={{
                      display: "block",
                      fontWeight: "var(--font-weight-semibold)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    Election Date <span aria-hidden="true" style={{ color: "var(--status-error)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="election-date"
                    className="input-field"
                    value={form.electionDate}
                    onChange={(e) => setForm({ ...form, electionDate: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!errors["electionDate"]}
                    aria-describedby="election-date-hint"
                  />
                  <p
                    id="election-date-hint"
                    style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}
                  >
                    Age is calculated as of election day.
                  </p>
                </div>

                {/* Citizenship */}
                <fieldset
                  style={{ border: "none", padding: 0, marginBottom: "var(--space-5)" }}
                  aria-invalid={!!errors["isCitizen"]}
                  aria-describedby={errors["isCitizen"] ? "citizen-error" : undefined}
                >
                  <legend
                    style={{ fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}
                  >
                    Are you a citizen of your selected country?{" "}
                    <span aria-hidden="true" style={{ color: "var(--status-error)" }}>*</span>
                  </legend>
                  <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
                    {[
                      { value: "yes", label: "Yes, I am a citizen" },
                      { value: "no", label: "No, I am not a citizen" },
                    ].map(({ value, label }) => (
                      <label
                        key={value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-3) var(--space-5)",
                          border: `2px solid ${form.isCitizen === value ? "var(--brand-primary)" : "var(--border-default)"}`,
                          borderRadius: "var(--radius-md)",
                          background: form.isCitizen === value ? "var(--brand-subtle)" : "transparent",
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                        }}
                      >
                        <input
                          type="radio"
                          name="isCitizen"
                          value={value}
                          checked={form.isCitizen === value}
                          onChange={() => setForm({ ...form, isCitizen: value })}
                          style={{ accentColor: "var(--brand-primary)" }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {errors["isCitizen"] && (
                    <p
                      id="citizen-error"
                      role="alert"
                      style={{ color: "var(--status-error)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}
                    >
                      {errors["isCitizen"]}
                    </p>
                  )}
                </fieldset>

                {/* Residency */}
                <div style={{ marginBottom: "var(--space-5)" }}>
                  <label
                    htmlFor="residency-date"
                    style={{
                      display: "block",
                      fontWeight: "var(--font-weight-semibold)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    When did you establish residency? <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                  </label>
                  <input
                    type="date"
                    id="residency-date"
                    className="input-field"
                    value={form.residencyStartDate}
                    onChange={(e) => setForm({ ...form, residencyStartDate: e.target.value })}
                    aria-describedby="residency-hint"
                    max={new Date().toISOString().split("T")[0]}
                  />
                  <p
                    id="residency-hint"
                    style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}
                  >
                    Some countries require a minimum residency period before elections.
                  </p>
                </div>

                {/* Prior conviction */}
                <fieldset
                  style={{ border: "none", padding: 0, marginBottom: "var(--space-5)" }}
                >
                  <legend
                    style={{ fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}
                  >
                    Do you have a felony conviction?{" "}
                    <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                  </legend>
                  <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    {[
                      { value: "no", label: "No" },
                      { value: "yes", label: "Yes" },
                      { value: "", label: "Prefer not to say" },
                    ].map(({ value, label }) => (
                      <label
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-2) var(--space-4)",
                          border: `2px solid ${form.hasFelon === value && value !== "" ? "var(--brand-primary)" : "var(--border-default)"}`,
                          borderRadius: "var(--radius-md)",
                          background: form.hasFelon === value && value !== "" ? "var(--brand-subtle)" : "transparent",
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        <input
                          type="radio"
                          name="hasFelon"
                          value={value}
                          checked={form.hasFelon === value}
                          onChange={() => setForm({ ...form, hasFelon: value })}
                          style={{ accentColor: "var(--brand-primary)" }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Submit */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isChecking}
                  style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-4)" }}
                  aria-busy={isChecking}
                >
                  {isChecking ? (
                    <>
                      <span className="sr-only">Checking eligibility…</span>
                      <span aria-hidden="true">⏳ Checking…</span>
                    </>
                  ) : (
                    "Check My Eligibility →"
                  )}
                </button>

                <div
                  className="alert alert-info"
                  role="note"
                  style={{ marginTop: "var(--space-4)" }}
                >
                  <span aria-hidden="true">🔒</span>
                  <span style={{ fontSize: "var(--text-sm)" }}>
                    Your information is not stored or transmitted. All checks happen instantly in your browser.
                  </span>
                </div>
              </div>
            </form>
          ) : (
            // ── Results ────────────────────────────────────────────────────────────
            <div>
              <div
                className={`alert ${
                  result.status === "eligible"
                    ? "alert-success"
                    : result.status === "ineligible"
                    ? "alert-error"
                    : "alert-warning"
                }`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{
                  marginBottom: "var(--space-6)",
                  padding: "var(--space-6)",
                  borderRadius: "var(--radius-xl)",
                  borderInlineStartWidth: "6px",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: "2.5rem" }}>
                  {result.status === "eligible" ? "✅" : result.status === "ineligible" ? "❌" : "⚠️"}
                </span>
                <div>
                  <strong style={{ fontSize: "var(--text-xl)", display: "block", marginBottom: "var(--space-2)" }}>
                    {result.status === "eligible"
                      ? "You appear to be eligible to vote!"
                      : result.status === "ineligible"
                      ? "You may not be eligible to vote."
                      : "Further verification required."}
                  </strong>
                  <p style={{ fontSize: "var(--text-sm)", opacity: 0.85 }}>
                    This is a general guide only. Always verify with your official electoral authority before election day.
                  </p>
                </div>
              </div>

              {/* Reason breakdown */}
              {result.reasons.length > 0 && (
                <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
                  <h2
                    style={{
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    Eligibility Breakdown
                  </h2>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    {result.reasons.map((reason, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "var(--space-3)",
                          paddingBottom: "var(--space-4)",
                          borderBottom: i < result.reasons.length - 1 ? "1px solid var(--border-default)" : "none",
                        }}
                      >
                        <StatusIcon passed={reason.passed} />
                        <div>
                          <strong style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)" }}>
                            {reason.rule}
                          </strong>
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                            {reason.explanation}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next steps */}
              {result.nextSteps.length > 0 && (
                <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
                  <h2
                    style={{
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {result.status === "eligible" ? "🎉 Your Next Steps" : "📋 What You Can Do"}
                  </h2>
                  <ol
                    style={{
                      paddingInlineStart: "var(--space-5)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-3)",
                    }}
                  >
                    {result.nextSteps.map((step, i) => (
                      <li key={i} style={{ fontSize: "var(--text-base)", lineHeight: "var(--leading-relaxed)" }}>
                        {step}
                      </li>
                    ))}
                  </ol>

                  {result.registrationUrl && (
                    <a
                      href={result.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ marginTop: "var(--space-6)", display: "inline-flex" }}
                    >
                      Register to Vote →
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <button className="btn btn-secondary" onClick={handleReset}>
                  ← Start Over
                </button>
                <Link href="/guide" className="btn btn-primary">
                  Go to Voting Guide →
                </Link>
                <Link href="/chat" className="btn btn-ghost">
                  Ask CivicBot a Question
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
