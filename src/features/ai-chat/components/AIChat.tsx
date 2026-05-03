"use client";

/**
 * AIChat (CivicBot) — Interactive Q&A Assistant
 * WCAG 2.2 AA compliant.
 */

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import type { ChatMessage, CivicSource, LanguageCode } from "@civiciq/types";

// ─── Predefined Q&A ───────────────────────────────────────────────────────────

const PREDEFINED_QA: Record<string, { answer: string; sources: CivicSource[] }> = {
  "Am I eligible to vote in my country?": {
    answer: "Eligibility varies by country, but generally, you must be a citizen, meet the minimum age requirement (usually 18), and be registered to vote. Some countries also have residency requirements.",
    sources: [{ title: "General Voting Requirements", url: "#", organization: "CivicIQ Guide" }]
  },
  "How do I register to vote?": {
    answer: "You can usually register online, by mail, or in person at designated government offices. Deadlines apply, so it's best to register well in advance of election day.",
    sources: [{ title: "Voter Registration Options", url: "#", organization: "CivicIQ Guide" }]
  },
  "What ID do I need to bring to vote?": {
    answer: "ID requirements depend on your location. Some places require government-issued photo ID (like a driver's license or passport), while others accept non-photo IDs like utility bills, or no ID at all if you are already registered.",
    sources: [{ title: "Voter ID Laws", url: "#", organization: "CivicIQ Guide" }]
  },
  "When is the next election in my country?": {
    answer: "Election dates depend on your specific country and local municipality. You can check our Election Calendar feature to see all upcoming dates and deadlines for your area.",
    sources: [{ title: "Election Calendar", url: "/calendar", organization: "CivicIQ Tools" }]
  },
  "How does the voting process work step by step?": {
    answer: "1. Register to vote.\n2. Verify your polling location.\n3. Bring necessary ID.\n4. Request a ballot.\n5. Fill out your ballot privately.\n6. Submit your ballot into the secure scanner or box.",
    sources: [{ title: "Voting Process Guide", url: "/guide", organization: "CivicIQ Tools" }]
  },
  "Can I vote by mail or absentee?": {
    answer: "Yes, many regions allow absentee or mail-in voting. You typically need to request a ballot in advance. Some areas automatically mail ballots to all registered voters.",
    sources: [{ title: "Mail-in Voting Options", url: "#", organization: "CivicIQ Guide" }]
  }
};

const CONVERSATION_STARTERS = [
  { icon: "✅", text: "Am I eligible to vote in my country?" },
  { icon: "📋", text: "How do I register to vote?" },
  { icon: "🪪", text: "What ID do I need to bring to vote?" },
  { icon: "📅", text: "When is the next election in my country?" },
  { icon: "🗳️", text: "How does the voting process work step by step?" },
  { icon: "📬", text: "Can I vote by mail or absentee?" },
];

// ─── Message Component ────────────────────────────────────────────────────────

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
      style={{ marginBottom: "var(--space-4)" }}
    >
      {/* Author label */}
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginBottom: "var(--space-1)",
          textAlign: isUser ? "right" : "left",
          fontWeight: "var(--font-weight-semibold)",
        }}
        aria-hidden="true"
      >
        {isUser ? "You" : "🤖 CivicBot"}
      </div>

      <div
        className={
          isUser ? "chat-message-user" : "chat-message-assistant"
        }
        style={{ display: "inline-block", maxWidth: "80%" }}
      >
        {/* Message content */}
        <div
          style={{
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-relaxed)",
            whiteSpace: "pre-wrap",
            color: isUser ? "white" : "inherit", // Keeping text readable in user bubble
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

        {/* Sources */}
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
                    aria-label={`Source: ${source.title} (opens in new tab)`}
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

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      style={{ padding: "var(--space-2) 0" }}
    >
      <span className="sr-only">CivicBot is typing...</span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          borderBottomLeftRadius: "var(--radius-sm)",
          width: "fit-content",
        }}
        aria-hidden="true"
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

// ─── Main AIChat Component ────────────────────────────────────────────────────

interface AIChatProps {
  countryCode?: string;
  language?: LanguageCode;
  sessionId?: string;
}

export function AIChat(_props: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageLogId = useId();

  // ── Auto-scroll to latest message ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Send message (Q&A Simulation) ──────────────────────────────────────────
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
    const assistantMsgId = crypto.randomUUID();

    // Simulate network delay and streaming
    setTimeout(() => {
      setIsTyping(false);
      
      const answerContent = qa?.answer ?? "I'm sorry, I don't have information on that topic right now.";
      const sources = qa?.sources ?? [];

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: answerContent,
          timestamp: new Date().toISOString(),
          sources: sources,
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
      {/* Header */}
      <div
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
          <h2
            id="chat-heading"
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            CivicBot Q&A
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Select a question below to learn more!
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        id={messageLogId}
        role="log"
        aria-label="Chat conversation"
        aria-live="polite"
        aria-relevant="additions"
        className="chat-messages"
        style={{ flex: 1, paddingBottom: "var(--space-8)" }}
      >
        {messages.length === 0 && (
          <div
            style={{
              padding: "var(--space-6)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--font-weight-semibold)",
                marginBottom: "var(--space-2)",
              }}
            >
              👋 Hello! I&apos;m CivicBot.
            </p>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "var(--space-6)",
                fontSize: "var(--text-sm)",
              }}
            >
              I can help you understand elections, voting procedures, and civic processes. Select a common question to get started!
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            isStreaming={false}
          />
        ))}

        {isTyping && <TypingIndicator />}
        
        {/* Available Questions List (always visible at bottom or after messages) */}
        {!isTyping && (
           <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px dashed var(--border-default)" }}>
             <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>Choose a question:</p>
             <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--space-3)",
              }}
              role="group"
              aria-label="Available questions"
            >
              {CONVERSATION_STARTERS.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => sendQuestion(starter.text)}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                    textAlign: "left",
                    lineHeight: "var(--leading-snug)",
                    display: "flex",
                    gap: "var(--space-2)",
                    transition: "all var(--transition-fast)",
                  }}
                  aria-label={`Ask: ${starter.text}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-primary)";
                    e.currentTarget.style.background = "var(--brand-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.background = "var(--bg-surface)";
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
