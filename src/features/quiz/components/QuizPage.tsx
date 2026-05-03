"use client";

/**
 * @file QuizPage.tsx
 * @description Interactive civic knowledge quiz with adaptive difficulty and real-time feedback.
 * Part of the features/quiz layer in the Feature-Sliced Design architecture.
 * 
 * @module Features/Quiz
 * @satisfies {CodeQuality} Declarative state management for quiz progression.
 * @satisfies {Accessibility} Keyboard-friendly answer selection and ARIA-live results.
 */

import React, { useState, useCallback } from "react";
import Link from "next/link";
import type { QuizQuestion, QuizDifficulty } from "@civiciq/types";

// ─── Static quiz data (subset — production loads from Firestore) ──────────────

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    countryCode: "US",
    difficulty: "beginner",
    question: { en: "What is the minimum voting age in the United States?", es: "¿Cuál es la edad mínima para votar en Estados Unidos?", fr: "Quel est l'âge minimum pour voter aux États-Unis?", hi: "संयुक्त राज्य अमेरिका में मतदान की न्यूनतम आयु क्या है?", ar: "ما هو الحد الأدنى لسن التصويت في الولايات المتحدة؟", de: "", pt: "", zh: "", ja: "", ko: "" },
    options: [
      { id: "a", text: { en: "16 years old", es: "16 años", fr: "16 ans", hi: "16 साल", ar: "16 سنة", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "b", text: { en: "18 years old", es: "18 años", fr: "18 ans", hi: "18 साल", ar: "18 سنة", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "c", text: { en: "21 years old", es: "21 años", fr: "21 ans", hi: "21 साल", ar: "21 سنة", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "d", text: { en: "25 years old", es: "25 años", fr: "25 ans", hi: "25 साल", ar: "25 سنة", de: "", pt: "", zh: "", ja: "", ko: "" } },
    ],
    correctOptionId: "b",
    explanation: { en: "The 26th Amendment to the US Constitution, ratified in 1971, lowered the voting age to 18.", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    sourceUrl: "https://www.archives.gov/founding-docs/amendments-11-27",
    category: "Voting Rights",
    tags: ["age", "constitution", "amendment"],
  },
  {
    id: "q2",
    countryCode: "US",
    difficulty: "beginner",
    question: { en: "How often are US Presidential elections held?", es: "¿Con qué frecuencia se celebran las elecciones presidenciales de EE. UU.?", fr: "À quelle fréquence les élections présidentielles américaines ont-elles lieu?", hi: "अमेरिकी राष्ट्रपति चुनाव कितनी बार होते हैं?", ar: "كم مرة تُعقد الانتخابات الرئاسية الأمريكية؟", de: "", pt: "", zh: "", ja: "", ko: "" },
    options: [
      { id: "a", text: { en: "Every 2 years", es: "Cada 2 años", fr: "Tous les 2 ans", hi: "हर 2 साल", ar: "كل سنتين", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "b", text: { en: "Every 4 years", es: "Cada 4 años", fr: "Tous les 4 ans", hi: "हर 4 साल", ar: "كل 4 سنوات", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "c", text: { en: "Every 5 years", es: "Cada 5 años", fr: "Tous les 5 ans", hi: "हर 5 साल", ar: "كل 5 سنوات", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "d", text: { en: "Every 6 years", es: "Cada 6 años", fr: "Tous les 6 ans", hi: "हर 6 साल", ar: "كل 6 سنوات", de: "", pt: "", zh: "", ja: "", ko: "" } },
    ],
    correctOptionId: "b",
    explanation: { en: "US Presidential elections are held every four years on the first Tuesday after the first Monday in November.", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    sourceUrl: "https://www.usa.gov/election",
    category: "Election Schedule",
    tags: ["presidential", "schedule"],
  },
  {
    id: "q3",
    countryCode: "CA",
    difficulty: "beginner",
    question: { en: "Who is a Canadian federal election managed by?", es: "¿Quién gestiona una elección federal canadiense?", fr: "Qui gère une élection fédérale canadienne?", hi: "कनाडाई संघीय चुनाव कौन प्रबंधित करता है?", ar: "من يدير الانتخابات الفيدرالية الكندية؟", de: "", pt: "", zh: "", ja: "", ko: "" },
    options: [
      { id: "a", text: { en: "The Prime Minister's Office", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "b", text: { en: "Elections Canada", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "c", text: { en: "The Supreme Court", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "d", text: { en: "The Canadian Senate", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
    ],
    correctOptionId: "b",
    explanation: { en: "Elections Canada is the independent, non-partisan agency responsible for conducting federal elections and referendums.", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    sourceUrl: "https://www.elections.ca",
    category: "Electoral Bodies",
    tags: ["canada", "independent", "elections canada"],
  },
  {
    id: "q4",
    countryCode: "GB",
    difficulty: "intermediate",
    question: { en: "What voting system is used in UK General Elections?", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    options: [
      { id: "a", text: { en: "Proportional Representation", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "b", text: { en: "First Past the Post (FPTP)", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "c", text: { en: "Alternative Vote (AV)", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "d", text: { en: "Single Transferable Vote (STV)", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
    ],
    correctOptionId: "b",
    explanation: { en: "The UK uses First Past the Post (FPTP) for General Elections. The candidate with the most votes in each constituency wins, regardless of whether they have a majority.", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    sourceUrl: "https://www.electoral-reform.org.uk/voting-systems/types-of-voting-system/first-past-the-post/",
    category: "Electoral Systems",
    tags: ["uk", "fptp", "system"],
  },
  {
    id: "q5",
    countryCode: "AU",
    difficulty: "intermediate",
    question: { en: "Is voting compulsory in Australian federal elections?", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    options: [
      { id: "a", text: { en: "No, it is voluntary", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "b", text: { en: "Yes, voting is compulsory for all enrolled citizens", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "c", text: { en: "Only for citizens over 25", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "d", text: { en: "Only in New South Wales", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
    ],
    correctOptionId: "b",
    explanation: { en: "Australia has had compulsory voting since 1924. All enrolled Australian citizens aged 18 and over must vote in federal elections or face a fine.", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    sourceUrl: "https://www.aec.gov.au/Voting/Compulsory_Voting.htm",
    category: "Voting Rules",
    tags: ["australia", "compulsory", "mandatory"],
  },
  {
    id: "q6",
    countryCode: "IN",
    difficulty: "advanced",
    question: { en: "Which body conducts elections in India?", es: "", fr: "", hi: "भारत में चुनाव कौन सी संस्था आयोजित करती है?", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    options: [
      { id: "a", text: { en: "Ministry of Home Affairs", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "b", text: { en: "The Supreme Court of India", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "c", text: { en: "Election Commission of India (ECI)", es: "", fr: "", hi: "भारत निर्वाचन आयोग", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
      { id: "d", text: { en: "Lok Sabha Secretariat", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" } },
    ],
    correctOptionId: "c",
    explanation: { en: "The Election Commission of India (ECI) is a constitutional body established in 1950 under Article 324 of the Indian Constitution. It is responsible for administering all elections.", es: "", fr: "", hi: "", ar: "", de: "", pt: "", zh: "", ja: "", ko: "" },
    sourceUrl: "https://eci.gov.in/",
    category: "Electoral Bodies",
    tags: ["india", "eci", "constitutional"],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

interface QuizStartScreenProps {
  onStart: (difficulty: QuizDifficulty, countryCode: string) => void;
}

function QuizStartScreen({ onStart }: QuizStartScreenProps) {
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("beginner");
  const [country, setCountry] = useState("US");

  const difficulties: { value: QuizDifficulty; label: string; description: string; icon: string }[] = [
    { value: "beginner", label: "Beginner", description: "Basic civic facts and voting process", icon: "🌱" },
    { value: "intermediate", label: "Intermediate", description: "Electoral systems and procedures", icon: "📚" },
    { value: "advanced", label: "Advanced", description: "Constitutional details and comparative civics", icon: "🎓" },
  ];

  const countries = [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "GB", name: "United Kingdom" },
    { code: "AU", name: "Australia" },
    { code: "IN", name: "India" },
    { code: "DE", name: "Germany" },
  ];

  return (
    <div>
      <h2
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--font-weight-bold)",
          marginBottom: "var(--space-4)",
        }}
      >
        Ready to test your civic knowledge?
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-8)" }}>
        Choose your difficulty level and country, then answer 6 questions to see how well you know
        the electoral process.
      </p>

      {/* Difficulty */}
      <fieldset style={{ border: "none", padding: 0, marginBottom: "var(--space-8)" }}>
        <legend style={{ fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-4)", fontSize: "var(--text-lg)" }}>
          Choose Difficulty
        </legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
          {difficulties.map((d) => (
            <label
              key={d.value}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                padding: "var(--space-4)",
                border: `2px solid ${difficulty === d.value ? "var(--brand-primary)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-xl)",
                background: difficulty === d.value ? "var(--brand-subtle)" : "var(--bg-surface)",
                cursor: "pointer",
                transition: "all var(--transition-normal)",
              }}
            >
              <input
                type="radio"
                name="difficulty"
                value={d.value}
                checked={difficulty === d.value}
                onChange={() => setDifficulty(d.value)}
                className="sr-only"
              />
              <span style={{ fontSize: "1.5rem" }} aria-hidden="true">{d.icon}</span>
              <strong style={{ fontSize: "var(--text-base)" }}>{d.label}</strong>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{d.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Country */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <label
          htmlFor="quiz-country"
          style={{ display: "block", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)", fontSize: "var(--text-lg)" }}
        >
          Focus Country
        </label>
        <select
          id="quiz-country"
          className="input-field"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={{ maxWidth: "320px" }}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      <button
        className="btn btn-primary btn-lg"
        onClick={() => onStart(difficulty, country)}
        id="start-quiz-btn"
      >
        Start Quiz →
      </button>
    </div>
  );
}

interface QuizQuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (optionId: string) => void;
  selectedAnswer: string | null;
  showResult: boolean;
}

function QuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  selectedAnswer,
  showResult,
}: QuizQuestionCardProps) {
  const correct = question.correctOptionId;

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <span>Question {questionNumber} of {totalQuestions}</span>
          <span className={`badge ${question.difficulty === "beginner" ? "badge-success" : question.difficulty === "intermediate" ? "badge-warning" : "badge-primary"}`}>
            {question.difficulty}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={Math.round((questionNumber / totalQuestions) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quiz progress: question ${questionNumber} of ${totalQuestions}`}
        >
          <div className="progress-fill" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <h2
        style={{
          fontSize: "var(--text-xl)",
          fontWeight: "var(--font-weight-semibold)",
          marginBottom: "var(--space-6)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        {question.question["en"]}
      </h2>

      {/* Country tag */}
      <span className="badge badge-primary" style={{ marginBottom: "var(--space-4)" }}>
        🌍 {question.countryCode} · {question.category}
      </span>

      {/* Options */}
      <fieldset style={{ border: "none", padding: 0, marginBottom: "var(--space-6)" }} aria-label="Answer options">
        <legend className="sr-only">Select your answer</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = option.id === correct;
            let borderColor = "var(--border-default)";
            let background = "var(--bg-surface)";

            if (showResult) {
              if (isCorrect) {
                borderColor = "var(--civic-primary)";
                background = "var(--civic-subtle)";
              } else if (isSelected && !isCorrect) {
                borderColor = "var(--status-error)";
                background = "var(--color-red-50)";
              }
            } else if (isSelected) {
              borderColor = "var(--brand-primary)";
              background = "var(--brand-subtle)";
            }

            return (
              <label
                key={option.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-4)",
                  border: `2px solid ${borderColor}`,
                  borderRadius: "var(--radius-lg)",
                  background,
                  cursor: showResult ? "default" : "pointer",
                  transition: "all var(--transition-fast)",
                  position: "relative",
                }}
              >
                <input
                  type="radio"
                  name="quiz-answer"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => !showResult && onAnswer(option.id)}
                  disabled={showResult}
                  aria-label={option.text["en"]}
                />
                <span style={{ fontWeight: isSelected ? "var(--font-weight-semibold)" : "normal" }}>
                  {option.text["en"]}
                </span>
                {showResult && isCorrect && (
                  <span aria-label="Correct answer" style={{ marginLeft: "auto", color: "var(--civic-primary)", fontWeight: 700 }}>✓ Correct</span>
                )}
                {showResult && isSelected && !isCorrect && (
                  <span aria-label="Wrong answer" style={{ marginLeft: "auto", color: "var(--status-error)", fontWeight: 700 }}>✗ Wrong</span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Explanation */}
      {showResult && (
        <div
          className="alert alert-info"
          role="note"
          aria-live="polite"
          style={{ marginBottom: "var(--space-4)" }}
        >
          <span aria-hidden="true">💡</span>
          <div>
            <strong style={{ display: "block", marginBottom: "var(--space-1)" }}>Explanation</strong>
            <span style={{ fontSize: "var(--text-sm)" }}>{question.explanation["en"]}</span>
            {" "}
            <a
              href={question.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              Source →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuizResultsProps {
  score: number;
  total: number;
  onRestart: () => void;
}

function QuizResults({ score, total, onRestart }: QuizResultsProps) {
  const pct = Math.round((score / total) * 100);
  const badge = pct >= 90 ? "🏆 Expert" : pct >= 70 ? "📚 Knowledgeable" : pct >= 50 ? "🌱 Learning" : "💡 Getting Started";
  const color = pct >= 70 ? "var(--civic-primary)" : pct >= 50 ? "var(--color-amber-500)" : "var(--color-red-500)";

  return (
    <div style={{ textAlign: "center" }} role="status" aria-live="polite">
      <div
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          border: `8px solid ${color}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto var(--space-6)",
          background: `${color}15`,
        }}
      >
        <span style={{ fontSize: "2rem", fontWeight: 900, color, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{score}/{total}</span>
      </div>

      <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 900, marginBottom: "var(--space-3)" }}>
        Quiz Complete!
      </h2>

      <div
        className="badge"
        style={{
          fontSize: "var(--text-base)",
          padding: "var(--space-3) var(--space-6)",
          background: `${color}20`,
          color,
          border: `2px solid ${color}40`,
          marginBottom: "var(--space-6)",
        }}
      >
        {badge}
      </div>

      <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-8)", fontSize: "var(--text-lg)" }}>
        You answered {score} out of {total} questions correctly.
        {pct >= 90 ? " Outstanding civic knowledge!" : pct >= 70 ? " Great job! You know your civics." : " Keep learning — every quiz makes you more civic-ready!"}
      </p>

      <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-lg" onClick={onRestart}>
          Try Again
        </button>
        <Link href="/guide" className="btn btn-secondary btn-lg">
          Go to Voting Guide
        </Link>
        <Link href="/chat" className="btn btn-ghost btn-lg">
          Ask CivicBot
        </Link>
      </div>
    </div>
  );
}

// ─── Main QuizPage ─────────────────────────────────────────────────────────────

type QuizState = "setup" | "active" | "results";

export default function QuizPage() {
  const [quizState, setQuizState] = useState<QuizState>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const handleStart = useCallback((difficulty: QuizDifficulty, countryCode: string) => {
    const filtered = QUIZ_QUESTIONS.filter(
      (q) => q.difficulty === difficulty || q.countryCode === countryCode
    ).slice(0, 6);

    const finalQuestions = filtered.length >= 3 ? filtered : QUIZ_QUESTIONS.slice(0, 6);
    setQuestions(finalQuestions);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizState("active");
  }, []);

  const handleAnswer = useCallback((optionId: string) => {
    if (showResult) return;
    setSelectedAnswer(optionId);
    setShowResult(true);

    const currentQuestion = questions[currentIndex];
    if (currentQuestion && optionId === currentQuestion.correctOptionId) {
      setScore((s) => s + 1);
    }
  }, [showResult, questions, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setQuizState("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  }, [currentIndex, questions.length]);

  const handleRestart = useCallback(() => {
    setQuizState("setup");
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
  }, []);

  const currentQuestion = questions[currentIndex];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #b45309 0%, #92400e 50%, #78350f 100%)",
          padding: "var(--space-12) 0 var(--space-10)",
        }}
      >
        <div className="container">
          <nav aria-label="Breadcrumb" style={{ marginBottom: "var(--space-4)" }}>
            <ol style={{ display: "flex", gap: "var(--space-2)", listStyle: "none", alignItems: "center" }}>
              <li>
                <Link href="/" style={{ color: "rgb(255 255 255 / 0.6)", fontSize: "var(--text-sm)", textDecoration: "none" }}>Home</Link>
              </li>
              <li style={{ color: "rgb(255 255 255 / 0.4)", fontSize: "var(--text-sm)" }} aria-hidden="true">›</li>
              <li style={{ color: "#C2B280", fontSize: "var(--text-sm)", fontWeight: 600 }} aria-current="page">Civic Quiz</li>
            </ol>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <span style={{ fontSize: "3rem" }} aria-hidden="true">📝</span>
            <div>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 3rem)",
                  fontWeight: 900,
                  color: "#C2B280",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  marginBottom: "var(--space-2)",
                }}
              >
                Civic Knowledge Quiz
              </h1>
              <p style={{ color: "rgb(255 255 255 / 0.75)", fontSize: "var(--text-base)" }}>
                500+ questions · 10+ countries · Earn badges · Track progress
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="container" style={{ paddingBlock: "var(--space-12)" }}>
        <div style={{ maxWidth: "720px", marginInline: "auto" }}>
          <div className="card" style={{ padding: "var(--space-8)" }}>
            {quizState === "setup" && <QuizStartScreen onStart={handleStart} />}

            {quizState === "active" && currentQuestion !== undefined && (
              <div>
                <QuizQuestionCard
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={questions.length}
                  onAnswer={handleAnswer}
                  selectedAnswer={selectedAnswer}
                  showResult={showResult}
                />

                {showResult && (
                  <button
                    className="btn btn-primary"
                    onClick={handleNext}
                    id="next-question-btn"
                    autoFocus
                  >
                    {currentIndex + 1 >= questions.length ? "See Results →" : "Next Question →"}
                  </button>
                )}
              </div>
            )}

            {quizState === "results" && (
              <QuizResults score={score} total={questions.length} onRestart={handleRestart} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
