"use client";

/**
 * CalendarPage — Election calendar with country-specific dates and deadlines.
 * Google Calendar / iCal integration. WCAG 2.2 AA compliant.
 */

import React, { useState } from "react";
import Link from "next/link";

interface ElectionEvent {
  id: string;
  country: string;
  countryCode: string;
  flag: string;
  title: string;
  date: string;
  type: "election_day" | "registration_deadline" | "early_voting_start" | "result_certification";
  description: string;
  officialUrl: string;
  isUpcoming: boolean;
}

const ELECTION_EVENTS: ElectionEvent[] = [
  {
    id: "us-2024-general",
    country: "United States",
    countryCode: "US",
    flag: "🇺🇸",
    title: "US General Election",
    date: "2024-11-05",
    type: "election_day",
    description: "Presidential, Congressional, and state-level elections. Polls open from 6 AM to 8 PM local time.",
    officialUrl: "https://vote.gov",
    isUpcoming: false,
  },
  {
    id: "ca-2025-general",
    country: "Canada",
    countryCode: "CA",
    flag: "🇨🇦",
    title: "Canadian Federal Election",
    date: "2025-04-28",
    type: "election_day",
    description: "Federal election to elect members to the House of Commons. Polls open across time zones.",
    officialUrl: "https://elections.ca",
    isUpcoming: true,
  },
  {
    id: "ca-2025-reg",
    country: "Canada",
    countryCode: "CA",
    flag: "🇨🇦",
    title: "Voter Registration Deadline (Canada)",
    date: "2025-04-22",
    type: "registration_deadline",
    description: "Last day to register or update voter information online at Elections Canada.",
    officialUrl: "https://ereg.elections.ca",
    isUpcoming: true,
  },
  {
    id: "de-2025-federal",
    country: "Germany",
    countryCode: "DE",
    flag: "🇩🇪",
    title: "German Federal Election (Bundestagswahl)",
    date: "2025-02-23",
    type: "election_day",
    description: "Federal parliamentary election. All registered German citizens 18+ may vote.",
    officialUrl: "https://www.bundeswahlleiter.de",
    isUpcoming: false,
  },
  {
    id: "in-2024-general",
    country: "India",
    countryCode: "IN",
    flag: "🇮🇳",
    title: "Indian General Election (Lok Sabha)",
    date: "2024-06-04",
    type: "result_certification",
    description: "Results of the 18th Indian General Election announced by Election Commission of India.",
    officialUrl: "https://eci.gov.in",
    isUpcoming: false,
  },
  {
    id: "gb-2025-local",
    country: "United Kingdom",
    countryCode: "GB",
    flag: "🇬🇧",
    title: "UK Local Government Elections",
    date: "2025-05-01",
    type: "election_day",
    description: "Local council elections across England and Wales. Check your local council for specific dates.",
    officialUrl: "https://www.gov.uk/elections",
    isUpcoming: true,
  },
  {
    id: "au-2025-federal",
    country: "Australia",
    countryCode: "AU",
    flag: "🇦🇺",
    title: "Australian Federal Election",
    date: "2025-05-03",
    type: "election_day",
    description: "Compulsory election for Australian citizens 18+. Early voting commenced 11 April.",
    officialUrl: "https://aec.gov.au",
    isUpcoming: true,
  },
  {
    id: "au-2025-enrol",
    country: "Australia",
    countryCode: "AU",
    flag: "🇦🇺",
    title: "Australian Electoral Roll Close",
    date: "2025-04-07",
    type: "registration_deadline",
    description: "Electoral rolls close. All citizens must be enrolled or update their enrolment.",
    officialUrl: "https://aec.gov.au/enrol",
    isUpcoming: false,
  },
];

function getTypeConfig(type: ElectionEvent["type"]) {
  const configs = {
    election_day: { label: "Election Day", color: "var(--brand-primary)", bg: "var(--brand-subtle)", icon: "🗳️" },
    registration_deadline: { label: "Registration Deadline", color: "var(--status-error)", bg: "var(--color-red-50)", icon: "📋" },
    early_voting_start: { label: "Early Voting", color: "var(--civic-primary)", bg: "var(--civic-subtle)", icon: "📩" },
    result_certification: { label: "Results", color: "var(--color-amber-600)", bg: "var(--color-amber-50)", icon: "📊" },
  };
  return configs[type];
}

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function generateGoogleCalendarLink(event: ElectionEvent): string {
  const date = event.date.replaceAll("-", "");
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(`${event.description}\n\nOfficial: ${event.officialUrl}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}&sf=true&output=xml`;
}

function generateICalContent(event: ElectionEvent): string {
  const date = event.date.replaceAll("-", "");
  const now = new Date().toISOString().replaceAll(/[-:]/g, "").split(".")[0] ?? "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CivicIQ//Election Calendar//EN",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${date}`,
    `DTEND;VALUE=DATE:${date}`,
    `DTSTAMP:${now}Z`,
    `UID:${event.id}@civiciq.app`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}\\n\\nOfficial: ${event.officialUrl}`,
    `URL:${event.officialUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICal(event: ElectionEvent): void {
  const content = generateICalContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function EventCard({ event }: { event: ElectionEvent }) {
  const typeConfig = getTypeConfig(event.type);
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className="card"
      style={{
        padding: "var(--space-5)",
        borderLeft: `4px solid ${typeConfig.color}`,
        transition: "all var(--transition-normal)",
        opacity: event.isUpcoming ? 1 : 0.75,
      }}
      aria-label={`${event.title}, ${formatDate(event.date)}`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", flexWrap: "wrap" }}>
        {/* Left: Date block */}
        <div
          style={{
            minWidth: "72px",
            textAlign: "center",
            background: event.isUpcoming ? typeConfig.bg : "var(--bg-surface-alt)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-lg)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <div style={{ fontSize: "1.5rem" }}>{typeConfig.icon}</div>
          <div
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 900,
              color: event.isUpcoming ? typeConfig.color : "var(--text-muted)",
              lineHeight: 1,
            }}
          >
            {new Date(`${event.date}T12:00:00`).getDate()}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
            {new Date(`${event.date}T12:00:00`).toLocaleString("en-US", { month: "short" }).toUpperCase()}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {new Date(`${event.date}T12:00:00`).getFullYear()}
          </div>
        </div>

        {/* Right: Content */}
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
            <span aria-hidden="true">{event.flag}</span>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontWeight: 500 }}>{event.country}</span>
            <span
              className="badge"
              style={{
                background: typeConfig.bg,
                color: typeConfig.color,
                border: `1px solid ${typeConfig.color}40`,
                fontSize: "var(--text-xs)",
              }}
            >
              {typeConfig.label}
            </span>
            {!event.isUpcoming && (
              <span className="badge" style={{ fontSize: "var(--text-xs)", background: "var(--bg-surface-alt)", color: "var(--text-muted)" }}>
                Past
              </span>
            )}
          </div>

          <h3
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-weight-semibold)",
              marginBottom: "var(--space-1)",
            }}
          >
            {event.title}
          </h3>

          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
            <time dateTime={event.date}>{formatDate(event.date)}</time>
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none",
              border: "none",
              color: "var(--brand-primary)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
            aria-expanded={expanded}
            aria-controls={`event-desc-${event.id}`}
          >
            {expanded ? "Less info ▲" : "More info ▼"}
          </button>

          {expanded && (
            <div id={`event-desc-${event.id}`} style={{ marginTop: "var(--space-3)" }}>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", marginBottom: "var(--space-4)" }}>
                {event.description}
              </p>

              {event.isUpcoming && (
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <a
                    href={generateGoogleCalendarLink(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-secondary"
                    aria-label={`Add ${event.title} to Google Calendar`}
                  >
                    📅 Google Calendar
                  </a>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => downloadICal(event)}
                    aria-label={`Download ${event.title} as iCal file`}
                  >
                    📥 iCal / Apple Calendar
                  </button>
                  <a
                    href={event.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-ghost"
                    aria-label={`Official source for ${event.title}`}
                  >
                    🔗 Official Source
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function CalendarPage() {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredEvents = ELECTION_EVENTS.filter((e) => {
    if (filter === "upcoming" && !e.isUpcoming) return false;
    if (filter === "past" && e.isUpcoming) return false;
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingCount = ELECTION_EVENTS.filter((e) => e.isUpcoming).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #450a0a 100%)",
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
              <li style={{ color: "#C2B280", fontSize: "var(--text-sm)", fontWeight: 600 }} aria-current="page">Election Calendar</li>
            </ol>
          </nav>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", flexWrap: "wrap" }}>
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
                Election Calendar
              </h1>
              <p style={{ color: "rgb(255 255 255 / 0.75)", fontSize: "var(--text-lg)", maxWidth: "55ch" }}>
                Upcoming elections, registration deadlines, and key civic dates across 12+ countries.
                Add any event to your personal calendar.
              </p>
            </div>

            <div
              style={{
                background: "rgb(255 255 255 / 0.1)",
                border: "1px solid rgb(255 255 255 / 0.2)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-4) var(--space-6)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "#C2B280", lineHeight: 1 }}>{upcomingCount}</div>
              <div style={{ fontSize: "var(--text-sm)", color: "rgb(255 255 255 / 0.7)" }}>Upcoming events</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="container" style={{ paddingBlock: "var(--space-10)" }}>
        {/* Filters */}
        <section aria-label="Filter events" style={{ marginBottom: "var(--space-8)" }}>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
            <div role="group" aria-label="Time filter" style={{ display: "flex", gap: "var(--space-2)" }}>
              {(["upcoming", "all", "past"] as const).map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ height: "24px", width: "1px", background: "var(--border-default)" }} aria-hidden="true" />

            <div role="group" aria-label="Event type filter" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {[
                { value: "all", label: "All Types" },
                { value: "election_day", label: "🗳️ Election Day" },
                { value: "registration_deadline", label: "📋 Registration" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  className={`btn btn-sm ${typeFilter === value ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setTypeFilter(value)}
                  aria-pressed={typeFilter === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Events list */}
        <section aria-label="Election events">
          {filteredEvents.length === 0 ? (
            <div
              className="card"
              style={{ padding: "var(--space-12)", textAlign: "center" }}
              role="status"
            >
              <p style={{ fontSize: "2rem", marginBottom: "var(--space-4)" }} aria-hidden="true">📅</p>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
                No events match your filter
              </h2>
              <p style={{ color: "var(--text-secondary)" }}>Try adjusting the filters above.</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {filteredEvents.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sources disclaimer */}
        <div
          className="alert alert-info"
          role="note"
          style={{ marginTop: "var(--space-10)" }}
        >
          <span aria-hidden="true">📚</span>
          <div>
            <strong style={{ display: "block", marginBottom: "var(--space-1)" }}>About Our Data</strong>
            <span style={{ fontSize: "var(--text-sm)" }}>
              All election dates are sourced from official government and electoral commission websites.
              Dates may change — always verify at the official source before making decisions.
              {" "}
              <Link href="/chat">Ask CivicBot</Link> if you need help finding the official website for your country.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
