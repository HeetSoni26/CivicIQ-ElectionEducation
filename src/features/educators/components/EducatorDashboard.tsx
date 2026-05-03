"use client";

import React, { useState } from "react";

// Mock Data for the Dashboard
const MOCK_STUDENTS = [
  { id: 1, name: "Alice Johnson", progress: 85, lastActive: "Today", quizScore: 90 },
  { id: 2, name: "Marcus Smith", progress: 100, lastActive: "Yesterday", quizScore: 95 },
  { id: 3, name: "Sarah Lee", progress: 40, lastActive: "2 days ago", quizScore: 60 },
  { id: 4, name: "David Chen", progress: 10, lastActive: "1 week ago", quizScore: null },
  { id: 5, name: "Emma Wilson", progress: 75, lastActive: "Today", quizScore: 80 },
];

const MOCK_LESSON_PLANS = [
  { title: "Introduction to Democracy", duration: "45 mins", grade: "6-8" },
  { title: "The Voting Process Step-by-Step", duration: "60 mins", grade: "9-12" },
  { title: "Understanding Electoral Systems", duration: "45 mins", grade: "9-12" },
];

export function EducatorDashboard() {
  const [activeTab, setActiveTab] = useState("roster");

  return (
    <div style={{ padding: "var(--space-8) 0", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-8)" }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: "var(--space-2)" }}>Educator Mode</span>
            <h1 style={{ fontSize: "var(--text-3xl)", letterSpacing: "-0.02em" }}>Civic Classroom Dashboard</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
              Manage your students&apos; civic education progress, assign quizzes, and access lesson plans.
            </p>
          </div>
          <button className="btn btn-primary">
            + Create New Assignment
          </button>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-8)" }}>
          {[
            { label: "Total Students", value: MOCK_STUDENTS.length, icon: "👥" },
            { label: "Avg. Completion", value: "62%", icon: "📈" },
            { label: "Avg. Quiz Score", value: "81%", icon: "🏆" },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ fontSize: "2rem", background: "var(--brand-subtle)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" }}>{stat.label}</div>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)" }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "var(--space-4)", borderBottom: "2px solid var(--border-default)", marginBottom: "var(--space-6)" }}>
          {[
            { id: "roster", label: "Student Roster" },
            { id: "lessons", label: "Lesson Plans" },
            { id: "assignments", label: "Active Assignments" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                padding: "var(--space-3) var(--space-4)",
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
                color: activeTab === tab.id ? "var(--brand-primary)" : "var(--text-secondary)",
                borderBottom: activeTab === tab.id ? "2px solid var(--brand-primary)" : "2px solid transparent",
                marginBottom: "-2px",
                cursor: "pointer",
                transition: "all var(--transition-fast)"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Roster */}
        {activeTab === "roster" && (
          <div className="card" style={{ padding: "0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "var(--bg-surface-alt)", borderBottom: "1px solid var(--border-default)" }}>
                <tr>
                  <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Student Name</th>
                  <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Guide Progress</th>
                  <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Last Active</th>
                  <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Latest Quiz Score</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_STUDENTS.map((student, i) => (
                  <tr key={student.id} style={{ borderBottom: i === MOCK_STUDENTS.length - 1 ? "none" : "1px solid var(--border-default)" }}>
                    <td style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-medium)" }}>{student.name}</td>
                    <td style={{ padding: "var(--space-4)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <div style={{ width: "100px", height: "8px", background: "var(--border-default)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                          <div style={{ width: `${student.progress}%`, height: "100%", background: "var(--civic-primary)" }} />
                        </div>
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{student.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{student.lastActive}</td>
                    <td style={{ padding: "var(--space-4)" }}>
                      {student.quizScore ? (
                        <span className={`badge ${student.quizScore >= 80 ? "badge-success" : "badge-warning"}`}>
                          {student.quizScore}%
                        </span>
                      ) : (
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Not taken</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content: Lesson Plans */}
        {activeTab === "lessons" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-6)" }}>
            {MOCK_LESSON_PLANS.map((plan, i) => (
              <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: "var(--text-lg)" }}>{plan.title}</h3>
                  <span className="badge badge-primary">Grades {plan.grade}</span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  <span>⏱️ {plan.duration}</span>
                  <span>📄 PDF Resources</span>
                </div>
                <div style={{ marginTop: "auto", paddingTop: "var(--space-4)" }}>
                  <button className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                    Download Lesson Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content: Assignments */}
        {activeTab === "assignments" && (
          <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "var(--space-4)" }}>📝</div>
            <h3 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}>No Active Assignments</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)", maxWidth: "400px", marginInline: "auto" }}>
              Create an assignment to have your students read specific sections of the Election Guide or take a knowledge check quiz.
            </p>
            <button className="btn btn-primary">Create Assignment</button>
          </div>
        )}

      </div>
    </div>
  );
}
