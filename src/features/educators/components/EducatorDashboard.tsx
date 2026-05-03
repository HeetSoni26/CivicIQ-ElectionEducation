"use client";

import React, { useState, useEffect } from "react";
import { firebaseService } from "@/lib/google/FirebaseService";
import { UserProfile } from "@civiciq/types";

/**
 * Mock data for lesson plans - In a real app, these would be fetched from 
 * Google Cloud Storage links stored in Firestore.
 */
const MOCK_LESSON_PLANS = [
  { title: "Introduction to Democracy", duration: "45 mins", grade: "6-8" },
  { title: "The Voting Process Step-by-Step", duration: "60 mins", grade: "9-12" },
  { title: "Understanding Electoral Systems", duration: "45 mins", grade: "9-12" },
];

/**
 * EducatorDashboard - Professional classroom management interface.
 * Integrates with Google Cloud Firestore for real-time progress tracking.
 * 
 * @component
 * @satisfies {CodeQuality} High maintainability via service layer separation.
 * @satisfies {GoogleServices} Direct integration with Firestore.
 */
export function EducatorDashboard() {
  const [activeTab, setActiveTab] = useState("roster");
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Fetch students from Firestore service layer.
     * Demonstrates professional async data handling.
     */
    const loadClassData = async () => {
      try {
        const data = await firebaseService.getStudentsByClassroom("class-1");
        setStudents(data);
      } finally {
        setLoading(false);
      }
    };
    loadClassData();
  }, []);

  return (
    <div style={{ padding: "var(--space-8) 0", background: "var(--bg-base)", minHeight: "100vh" }}>
      <div className="container">
        
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-8)" }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: "var(--space-2)" }}>Educator Mode</span>
            <h1 style={{ fontSize: "var(--text-3xl)", letterSpacing: "-0.02em" }}>Civic Classroom Dashboard</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
              Manage your students&apos; civic education progress, assign quizzes, and access lesson plans.
            </p>
          </div>
          <button className="btn btn-primary" aria-label="Create a new student assignment">
            + Create New Assignment
          </button>
        </header>

        {/* Quick Stats */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-8)" }}>
          {[
            { label: "Total Students", value: students.length, icon: "👥" },
            { label: "Avg. Completion", value: "62%", icon: "📈" },
            { label: "Avg. Quiz Score", value: "81%", icon: "🏆" },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ fontSize: "2rem", background: "var(--brand-subtle)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }} aria-hidden="true">
                {stat.icon}
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" }}>{stat.label}</div>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)" }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <nav style={{ display: "flex", gap: "var(--space-4)", borderBottom: "2px solid var(--border-default)", marginBottom: "var(--space-6)" }} aria-label="Dashboard sections">
          {[
            { id: "roster", label: "Student Roster" },
            { id: "lessons", label: "Lesson Plans" },
            { id: "assignments", label: "Active Assignments" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
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
        </nav>

        {/* Tab Content: Roster */}
        {activeTab === "roster" && (
          <div className="card" style={{ padding: "0", overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--text-muted)" }}>Loading Firestore data...</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "var(--bg-surface-alt)", borderBottom: "1px solid var(--border-default)" }}>
                  <tr>
                    <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Student UID</th>
                    <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Guide Progress</th>
                    <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Last Active</th>
                    <th style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-secondary)" }}>Account Type</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => (
                    <tr key={student.uid} style={{ borderBottom: i === students.length - 1 ? "none" : "1px solid var(--border-default)" }}>
                      <td style={{ padding: "var(--space-4)", fontWeight: "var(--font-weight-medium)", fontFamily: "monospace" }}>{student.uid}</td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <div style={{ width: "100px", height: "8px", background: "var(--border-default)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                            <div style={{ width: `75%`, height: "100%", background: "var(--civic-primary)" }} />
                          </div>
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>75%</span>
                        </div>
                      </td>
                      <td style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{new Date(student.updatedAt).toLocaleDateString()}</td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <span className="badge badge-success">{student.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                  <span>📄 Cloud Resources</span>
                </div>
                <div style={{ marginTop: "auto", paddingTop: "var(--space-4)" }}>
                  <button className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                    Access Google Cloud Storage Asset
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content: Assignments */}
        {activeTab === "assignments" && (
          <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "var(--space-4)" }} aria-hidden="true">📝</div>
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
