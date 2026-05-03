"use client";

/**
 * ChatPage — Wraps the AIChat component with a full-page layout.
 * Provides page-level navigation and context.
 */

import React from "react";
import Link from "next/link";
import { AIChat } from "./AIChat";

export default function ChatPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Page header */}
      <header
        style={{
          background: "linear-gradient(135deg, var(--color-primary-950) 0%, hsl(235 65% 18%) 100%)",
          padding: "var(--space-10) 0 var(--space-8)",
          flexShrink: 0,
        }}
      >
        <div className="container">
          <nav aria-label="Breadcrumb" style={{ marginBottom: "var(--space-4)" }}>
            <ol style={{ display: "flex", gap: "var(--space-2)", listStyle: "none", alignItems: "center" }}>
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
                CivicBot
              </li>
            </ol>
          </nav>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <span
                className="badge"
                style={{
                  background: "rgb(22 181 99 / 0.2)",
                  color: "var(--color-civic-300)",
                  border: "1px solid rgb(22 181 99 / 0.3)",
                  marginBottom: "var(--space-3)",
                  display: "inline-flex",
                }}
              >
                🤖 Powered by Google Gemini 1.5 Pro
              </span>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                  fontWeight: 900,
                  color: "#C2B280",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  marginBottom: "var(--space-2)",
                }}
              >
                Ask CivicBot
              </h1>
              <p style={{ color: "rgb(255 255 255 / 0.7)", fontSize: "var(--text-base)", maxWidth: "55ch" }}>
                Your AI-powered civic education assistant. Ask anything about elections, voting procedures,
                eligibility, or democracy — answers sourced from official government records only.
              </p>
            </div>

            {/* Guarantees */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "rgb(255 255 255 / 0.7)",
              }}
            >
              {[
                "🔒 Politically neutral — always",
                "📚 Official sources only",
                "⚡ No account required",
                "🌍 12+ countries supported",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main id="main-content" style={{ flex: 1, overflow: "hidden" }}>
        <div
          className="container"
          style={{ height: "100%", paddingBlock: "var(--space-6)" }}
        >
          <AIChat countryCode="US" />
        </div>
      </main>
    </div>
  );
}
