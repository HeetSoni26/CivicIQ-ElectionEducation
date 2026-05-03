"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Navigation ───────────────────────────────────────────────────────────────

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: "var(--z-overlay)",
        background: scrolled ? "rgb(255 255 255 / 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled ? "var(--shadow-sm)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-default)" : "none",
        transition: "all var(--transition-normal)",
      }}
    >
      <nav className="container" aria-label="Main navigation">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: "4rem",
            gap: "var(--space-8)",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              textDecoration: "none",
              color: scrolled ? "var(--text-primary)" : "white",
            }}
            aria-label="CivicIQ — Go to homepage"
          >
            <span
              style={{
                width: "2rem",
                height: "2rem",
                background: "var(--brand-primary)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
              aria-hidden="true"
            >
              🗳️
            </span>
            <span
              style={{
                fontWeight: "var(--font-weight-extrabold)",
                fontSize: "var(--text-xl)",
                letterSpacing: "-0.02em",
              }}
            >
              CivicIQ
            </span>
          </Link>

          {/* Desktop nav */}
          <ul
            style={{
              display: "flex",
              gap: "var(--space-6)",
              listStyle: "none",
              marginLeft: "auto",
            }}
            role="list"
          >
            {[
              { href: "/guide", label: "Voting Guide" },
              { href: "/eligibility", label: "Check Eligibility" },
              { href: "/chat", label: "Ask CivicBot" },
              { href: "/quiz", label: "Quiz" },
              { href: "/calendar", label: "Calendar" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  style={{
                    textDecoration: "none",
                    color: scrolled ? "var(--text-secondary)" : "rgb(255 255 255 / 0.85)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    transition: "color var(--transition-fast)",
                    padding: "var(--space-2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = scrolled
                      ? "var(--text-primary)"
                      : "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = scrolled
                      ? "var(--text-secondary)"
                      : "rgb(255 255 255 / 0.85)";
                  }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link href="/guide" className="btn btn-civic btn-sm" style={{ marginLeft: "var(--space-4)" }}>
            Get Started
          </Link>

          {/* Mobile menu button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            style={{ display: "none" }}
          >
            ☰
          </button>
        </div>
      </nav>
    </header>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="hero-gradient hero-mesh"
      style={{ padding: "6rem 0 8rem", position: "relative", overflow: "hidden" }}
      aria-labelledby="hero-heading"
    >
      {/* Background decorations */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "10%",
          right: "5%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgb(22 181 99 / 0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgb(100 118 243 / 0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="container">
        <div
          style={{
            textAlign: "center",
            maxWidth: "800px",
            marginInline: "auto",
          }}
        >
          {/* Badge */}
          <div
            className="animate-fade-up"
            style={{ marginBottom: "var(--space-6)", display: "inline-flex", gap: "var(--space-2)", alignItems: "center" }}
          >
            <span
              className="badge"
              style={{
                background: "rgb(22 181 99 / 0.2)",
                color: "var(--color-civic-300)",
                border: "1px solid rgb(22 181 99 / 0.3)",
                padding: "var(--space-2) var(--space-4)",
              }}
            >
              🌍 Covering 12+ Countries &nbsp; · &nbsp; ♿ WCAG 2.2 AA &nbsp; · &nbsp; 🔒 Politically Neutral
            </span>
          </div>

          {/* Headline */}
          <h1
            id="hero-heading"
            className="animate-fade-up animate-delay-100"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: "900",
              color: "#C2B280",
              lineHeight: "1.1",
              letterSpacing: "-0.03em",
              marginBottom: "var(--space-6)",
            }}
          >
            Understand Elections.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #3ccf83, #16b563)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Vote with Confidence.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="animate-fade-up animate-delay-200"
            style={{
              fontSize: "var(--text-xl)",
              color: "rgb(255 255 255 / 0.75)",
              lineHeight: "var(--leading-relaxed)",
              marginBottom: "var(--space-10)",
              maxWidth: "60ch",
              marginInline: "auto",
            }}
          >
            CivicIQ guides you through your country&apos;s complete election
            process — step by step, in plain language, verified from official
            government sources only.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up animate-delay-300"
            style={{
              display: "flex",
              gap: "var(--space-4)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/guide"
              className="btn btn-civic btn-lg"
              style={{ fontSize: "var(--text-base)" }}
            >
              🗳️ Start the Voting Guide
            </Link>
            <Link
              href="/eligibility"
              className="btn"
              style={{
                background: "rgb(255 255 255 / 0.1)",
                border: "2px solid rgb(255 255 255 / 0.3)",
                color: "#C2B280",
                fontSize: "var(--text-base)",
                padding: "var(--space-4) var(--space-8)",
                borderRadius: "var(--radius-md)",
                backdropFilter: "blur(8px)",
              }}
            >
              ✅ Check My Eligibility
            </Link>
          </div>

          {/* Trust indicators */}
          <div
            ref={statsRef}
            style={{
              display: "flex",
              gap: "var(--space-8)",
              justifyContent: "center",
              marginTop: "var(--space-16)",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "12+", label: "Countries Covered" },
              { value: "5", label: "Languages" },
              { value: "500+", label: "Quiz Questions" },
              { value: "100%", label: "Politically Neutral" },
            ].map(({ value, label }) => (
              <div
                key={label}
                style={{
                  textAlign: "center",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  transition: "all 0.6s ease-out",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                    fontWeight: "900",
                    color: "#C2B280",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "rgb(255 255 255 / 0.6)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: "🗺️",
      title: "Step-by-Step Voting Guide",
      description:
        "Walk through your country's complete voting process — from registration deadlines to what happens after you cast your ballot.",
      href: "/guide",
      cta: "Start Guide",
      color: "var(--brand-primary)",
      bg: "var(--brand-subtle)",
    },
    {
      icon: "✅",
      title: "Eligibility Checker",
      description:
        "Answer a few questions to find out if you can vote — including age, citizenship, residency, and registration requirements.",
      href: "/eligibility",
      cta: "Check Eligibility",
      color: "var(--civic-primary)",
      bg: "var(--civic-subtle)",
    },
    {
      icon: "🤖",
      title: "AI Civic Assistant",
      description:
        "Ask CivicBot any question about elections. It answers using only official government sources — never partisan content.",
      href: "/chat",
      cta: "Ask CivicBot",
      color: "#6476f3",
      bg: "var(--brand-subtle)",
    },
    {
      icon: "📝",
      title: "Knowledge Quiz",
      description:
        "Test your civic knowledge with 500+ questions across 10 countries. Track progress and earn badges.",
      href: "/quiz",
      cta: "Take a Quiz",
      color: "var(--color-amber-600)",
      bg: "var(--color-amber-50)",
    },
    {
      icon: "📅",
      title: "Election Calendar",
      description:
        "See upcoming election dates and deadlines for your country. Add reminders to your calendar.",
      href: "/calendar",
      cta: "View Calendar",
      color: "var(--color-red-600)",
      bg: "var(--color-red-50)",
    },
    {
      icon: "🎓",
      title: "Educator Mode",
      description:
        "Teachers can assign quizzes, track class progress, and build lesson plans around election content.",
      href: "/educators",
      cta: "For Educators",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
  ];

  return (
    <section
      style={{ padding: "var(--space-24) 0", background: "var(--bg-base)" }}
      aria-labelledby="features-heading"
    >
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "var(--space-16)" }}>
          <span
            className="badge badge-primary"
            style={{ marginBottom: "var(--space-4)" }}
          >
            Everything You Need
          </span>
          <h2
            id="features-heading"
            style={{
              fontSize: "var(--text-4xl)",
              fontWeight: "var(--font-weight-extrabold)",
              letterSpacing: "-0.02em",
              marginBottom: "var(--space-4)",
            }}
          >
            Tools for Every Voter
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-lg)",
              maxWidth: "55ch",
              marginInline: "auto",
            }}
          >
            Whether you&apos;re a first-time voter, a new citizen, or a civic
            educator — CivicIQ has the right tool for you.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "var(--space-6)",
          }}
          role="list"
        >
          {features.map((feat) => (
            <article
              key={feat.href}
              role="listitem"
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                padding: "var(--space-6)",
                transition: "all var(--transition-normal)",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-xl)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  background: feat.bg,
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                }}
                aria-hidden="true"
              >
                {feat.icon}
              </div>

              <div>
                <h3
                  style={{
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {feat.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: "var(--leading-relaxed)",
                  }}
                >
                  {feat.description}
                </p>
              </div>

              <Link
                href={feat.href}
                style={{
                  marginTop: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: feat.color,
                  textDecoration: "none",
                }}
                aria-label={`${feat.cta} — ${feat.title}`}
              >
                {feat.cta} →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Country Coverage Section ─────────────────────────────────────────────────

function CountryCoverageSection() {
  const countries = [
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

  return (
    <section
      style={{
        padding: "var(--space-24) 0",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-default)",
        borderBottom: "1px solid var(--border-default)",
      }}
      aria-labelledby="countries-heading"
    >
      <div className="container">
        <h2
          id="countries-heading"
          style={{
            textAlign: "center",
            fontSize: "var(--text-3xl)",
            fontWeight: "var(--font-weight-bold)",
            marginBottom: "var(--space-4)",
          }}
        >
          Countries We Cover
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-12)",
            maxWidth: "50ch",
            marginInline: "auto",
          }}
        >
          Election information sourced from official government and electoral
          commission websites.
        </p>

        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "var(--space-4)",
            listStyle: "none",
          }}
          aria-label="Supported countries"
        >
          {countries.map((country) => (
            <li key={country.code}>
              <Link
                href={`/guide?country=${country.code}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-4)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-xl)",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                  transition: "all var(--transition-normal)",
                  background: "var(--bg-base)",
                }}
                aria-label={`View election guide for ${country.name}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-primary)";
                  e.currentTarget.style.background = "var(--brand-subtle)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.background = "var(--bg-base)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: "2.5rem" }} aria-hidden="true">
                  {country.flag}
                </span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", textAlign: "center" }}>
                  {country.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── CivicBot Preview ─────────────────────────────────────────────────────────

function CivicBotPreview() {
  return (
    <section
      style={{
        padding: "var(--space-24) 0",
        background: "linear-gradient(135deg, var(--color-primary-950) 0%, hsl(235 65% 18%) 100%)",
        position: "relative",
        overflow: "hidden",
      }}
      aria-labelledby="civicbot-heading"
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-16)",
            alignItems: "center",
          }}
        >
          {/* Left: Text */}
          <div>
            <span
              className="badge"
              style={{
                background: "rgb(22 181 99 / 0.2)",
                color: "var(--color-civic-300)",
                border: "1px solid rgb(22 181 99 / 0.3)",
                marginBottom: "var(--space-4)",
              }}
            >
              Powered by Google Gemini
            </span>
            <h2
              id="civicbot-heading"
              style={{
                fontSize: "var(--text-4xl)",
                fontWeight: "900",
                color: "#C2B280",
                lineHeight: "1.15",
                letterSpacing: "-0.02em",
                marginBottom: "var(--space-4)",
              }}
            >
              Ask Anything About
              <br />
              <span style={{ color: "#3ccf83" }}>Elections</span>
            </h2>
            <p style={{ color: "rgb(255 255 255 / 0.7)", fontSize: "var(--text-lg)", lineHeight: "var(--leading-relaxed)", marginBottom: "var(--space-8)" }}>
              CivicBot has read thousands of pages of official electoral law.
              Ask your question in plain English — get a plain-English answer,
              always with sources.
            </p>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <Link href="/chat" className="btn btn-civic btn-lg">
                Chat with CivicBot →
              </Link>
              <Link
                href="/chat"
                className="btn"
                style={{
                  background: "transparent",
                  border: "2px solid rgb(255 255 255 / 0.3)",
                  color: "rgb(255 255 255 / 0.8)",
                  padding: "var(--space-4) var(--space-8)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-base)",
                }}
              >
                No account required
              </Link>
            </div>
          </div>

          {/* Right: Chat mockup */}
          <div
            className="glass"
            style={{
              borderRadius: "var(--radius-2xl)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "400px",
            }}
            aria-hidden="true"
          >
            {/* Header */}
            <div
              style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid rgb(255 255 255 / 0.1)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  background: "var(--brand-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                🤖
              </div>
              <div>
                <p style={{ color: "#C2B280", fontSize: "var(--text-sm)", fontWeight: "600" }}>CivicBot</p>
                <p style={{ color: "rgb(255 255 255 / 0.5)", fontSize: "var(--text-xs)" }}>Online · Politically Neutral</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: "var(--space-5)", flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div
                style={{
                  background: "rgb(255 255 255 / 0.1)",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-lg)",
                  borderBottomRightRadius: "var(--radius-sm)",
                  marginLeft: "auto",
                  maxWidth: "80%",
                  color: "#C2B280",
                  fontSize: "var(--text-sm)",
                }}
              >
                What ID do I need to vote in the US?
              </div>
              <div
                style={{
                  background: "rgb(255 255 255 / 0.07)",
                  border: "1px solid rgb(255 255 255 / 0.1)",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-lg)",
                  borderBottomLeftRadius: "var(--radius-sm)",
                  maxWidth: "85%",
                  color: "rgb(255 255 255 / 0.85)",
                  fontSize: "var(--text-sm)",
                  lineHeight: "1.6",
                }}
              >
                ID requirements vary by state. Most states accept a driver&apos;s license, state ID card, or US passport.
                Some states have no ID requirement. Check your state&apos;s official rules at vote.gov.
                <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "rgb(255 255 255 / 0.5)", borderTop: "1px solid rgb(255 255 255 / 0.1)", paddingTop: "var(--space-2)" }}>
                  📚 Source: vote.gov (Official US Government)
                </div>
              </div>
            </div>

            {/* Input */}
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderTop: "1px solid rgb(255 255 255 / 0.1)",
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: "rgb(255 255 255 / 0.08)",
                  border: "1px solid rgb(255 255 255 / 0.15)",
                  borderRadius: "var(--radius-full)",
                  padding: "var(--space-2) var(--space-4)",
                  color: "rgb(255 255 255 / 0.4)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Ask a question...
              </div>
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "50%",
                  background: "var(--civic-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#C2B280",
                  fontSize: "var(--text-sm)",
                }}
              >
                →
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Accessibility Banner ─────────────────────────────────────────────────────

function AccessibilitySection() {
  const features = [
    { icon: "⌨️", label: "Full keyboard navigation" },
    { icon: "🔊", label: "Screen reader optimized" },
    { icon: "📖", label: "Grade 6–8 reading level" },
    { icon: "🔤", label: "5 languages + RTL" },
    { icon: "📴", label: "Works offline (PWA)" },
    { icon: "🌐", label: "Low bandwidth mode" },
  ];

  return (
    <section
      style={{ padding: "var(--space-16) 0", background: "var(--brand-subtle)", borderTop: "1px solid var(--color-primary-100)" }}
      aria-labelledby="a11y-heading"
    >
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-12)", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <h2 id="a11y-heading" style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
              Built for Everyone
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
              CivicIQ meets WCAG 2.2 Level AA standards. Every feature is
              designed for users with disabilities, seniors,
              low-literacy voters, and low-bandwidth connections.
            </p>
          </div>
          <ul
            style={{
              flex: "2 1 400px",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-4)",
              listStyle: "none",
            }}
            aria-label="Accessibility features"
          >
            {features.map(({ icon, label }) => (
              <li
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-medium)",
                }}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const footerSections = [
    {
      title: "Resources",
      links: ["About CivicIQ", "Accessibility", "Privacy Policy", "Contact"],
    },
    {
      title: "Countries",
      links: ["United States", "Canada", "United Kingdom", "More..."],
    },
    {
      title: "Tools",
      links: ["Voting Guide", "AI Assistant", "Eligibility Checker", "Quiz"],
    },
  ];

  return (
    <footer
      style={{
        background: "var(--color-neutral-900)",
        color: "var(--color-neutral-300)",
        padding: "var(--space-16) 0 var(--space-8)",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "var(--space-12)",
            marginBottom: "var(--space-12)",
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-4)",
              }}
            >
              <span
                style={{
                  width: "2rem",
                  height: "2rem",
                  background: "var(--brand-primary)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-hidden="true"
              >
                🗳️
              </span>
              <span
                style={{
                  color: "#C2B280",
                  fontWeight: "800",
                  fontSize: "var(--text-xl)",
                }}
              >
                CivicIQ
              </span>
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-relaxed)",
                maxWidth: "35ch",
              }}
            >
              Free, accessible civic education for every voter, everywhere.
              Politically neutral. Verified sources. No registration required.
            </p>
          </div>

          {/* Nav columns */}
          {footerSections.map((section) => (
            <nav key={section.title} aria-label={`${section.title} links`}>
              <p
                style={{
                  color: "#C2B280",
                  fontWeight: "600",
                  marginBottom: "var(--space-4)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {section.title}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                {section.links.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      style={{
                        color: "var(--color-neutral-400)",
                        textDecoration: "none",
                        fontSize: "var(--text-sm)",
                        transition: "color var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color =
                          "var(--color-neutral-400)";
                      }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--color-neutral-800)",
            paddingTop: "var(--space-6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-4)",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-neutral-500)",
            }}
          >
            © 2025 CivicIQ. This platform is nonpartisan and does not endorse
            any political party, candidate, or electoral outcome.
          </p>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-neutral-500)",
            }}
          >
            Built on Google Cloud Platform · WCAG 2.2 AA Certified
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <CivicBotPreview />
      <CountryCoverageSection />
      <AccessibilitySection />
      <Footer />
    </main>
  );
}
