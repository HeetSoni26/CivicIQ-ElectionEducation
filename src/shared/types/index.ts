/**
 * @file index.ts
 * @description Centralized type definitions for the CivicIQ platform.
 * Ensures consistent data structures across the Features, Entities, and Shared layers.
 * 
 * @module Shared/Types
 * @satisfies {CodeQuality} Single Source of Truth (SSoT) for the entire application's type system.
 */

// ─── Country & Election System ────────────────────────────────────────────────

export type ElectionSystemType =
  | "parliamentary"
  | "presidential"
  | "semi_presidential"
  | "proportional"
  | "mixed_member";

export type LanguageCode =
  | "en"
  | "es"
  | "fr"
  | "hi"
  | "ar"
  | "de"
  | "pt"
  | "zh"
  | "ja"
  | "ko";

export interface CountryConfig {
  readonly countryCode: string; // ISO 3166-1 alpha-2
  readonly countryName: Record<LanguageCode, string>;
  readonly electionSystem: ElectionSystemType;
  readonly votingAge: number;
  readonly citizenshipRequired: boolean;
  readonly residencyDaysRequired: number;
  readonly allowsFelons: boolean;
  readonly mandatoryVoting: boolean;
  readonly voterIdRequired: boolean;
  readonly registrationDeadlineDays: number; // days before election day
  readonly earlyVotingAvailable: boolean;
  readonly absenteeAvailable: boolean;
  readonly onlineVotingAvailable: boolean;
  readonly updatedAt: string; // ISO 8601
  readonly version: number;
}

export interface StateProvinceConfig {
  readonly stateCode: string;
  readonly countryCode: string;
  readonly stateName: Record<LanguageCode, string>;
  readonly overrides: Partial<
    Pick<
      CountryConfig,
      | "votingAge"
      | "registrationDeadlineDays"
      | "earlyVotingAvailable"
      | "absenteeAvailable"
      | "voterIdRequired"
    >
  >;
}

// ─── Election Timeline ────────────────────────────────────────────────────────

export type TimelinePhase =
  | "pre_registration"
  | "registration_open"
  | "registration_closed"
  | "early_voting"
  | "election_day"
  | "vote_counting"
  | "result_certification"
  | "post_election";

export interface ElectionTimeline {
  readonly id: string;
  readonly countryCode: string;
  readonly electionName: Record<LanguageCode, string>;
  readonly phases: TimelinePhaseEntry[];
  readonly currentPhase: TimelinePhase;
  readonly isActive: boolean;
}

export interface TimelinePhaseEntry {
  readonly phase: TimelinePhase;
  readonly startDate: string; // ISO 8601
  readonly endDate: string; // ISO 8601
  readonly label: Record<LanguageCode, string>;
  readonly description: Record<LanguageCode, string>;
  readonly actionRequired: boolean;
  readonly actionUrl?: string;
}

// ─── Content ──────────────────────────────────────────────────────────────────

export interface CivicContent {
  readonly id: string;
  readonly countryCode: string;
  readonly contentType:
    | "procedure"
    | "eligibility"
    | "faq"
    | "glossary"
    | "guide";
  readonly title: Record<LanguageCode, string>;
  readonly body: Record<LanguageCode, string>; // Markdown
  readonly sourceUrl: string;
  readonly sourceOrganization: string;
  readonly fleschKincaidGrade: number;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly publishedBy: string;
  readonly isActive: boolean;
  readonly tags: string[];
}

// ─── Users & Auth ─────────────────────────────────────────────────────────────

export type UserRole = "anonymous" | "registered" | "educator" | "admin";

export interface UserProfile {
  readonly uid: string;
  readonly email?: string;
  readonly role: UserRole;
  readonly countryCode?: string;
  readonly preferredLanguage: LanguageCode;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isAnonymous: boolean;
  readonly educatorVerified?: boolean;
  readonly classroomIds?: string[];
}

export interface CustomClaims {
  readonly role: UserRole;
  readonly countryCode?: string;
  readonly educatorVerified?: boolean;
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp: string;
  readonly sources?: CivicSource[];
  readonly confidence?: number; // 0-1
  readonly flagged?: boolean;
}

export interface CivicSource {
  readonly title: string;
  readonly url: string;
  readonly organization: string;
  readonly retrievedAt: string;
}

export interface ConversationSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly countryCode?: string;
  readonly language: LanguageCode;
  readonly messages: ChatMessage[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly tokenCount: number;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export type QuizDifficulty = "beginner" | "intermediate" | "advanced";

export interface QuizQuestion {
  readonly id: string;
  readonly countryCode: string;
  readonly difficulty: QuizDifficulty;
  readonly question: Record<LanguageCode, string>;
  readonly options: QuizOption[];
  readonly correctOptionId: string;
  readonly explanation: Record<LanguageCode, string>;
  readonly sourceUrl: string;
  readonly category: string;
  readonly tags: string[];
}

export interface QuizOption {
  readonly id: string;
  readonly text: Record<LanguageCode, string>;
}

export interface QuizAttempt {
  readonly id: string;
  readonly userId: string;
  readonly quizId: string;
  readonly countryCode: string;
  readonly answers: QuizAnswer[];
  readonly score: number; // 0-100
  readonly completedAt: string;
  readonly timeTakenSeconds: number;
}

export interface QuizAnswer {
  readonly questionId: string;
  readonly selectedOptionId: string;
  readonly isCorrect: boolean;
  readonly timeSpentSeconds: number;
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

export type EligibilityStatus = "eligible" | "ineligible" | "check_required";

export interface EligibilityInput {
  readonly countryCode: string;
  readonly stateCode?: string;
  readonly birthDate: string; // ISO 8601 date
  readonly electionDate: string; // ISO 8601 date
  readonly isCitizen: boolean;
  readonly citizenshipDate?: string; // ISO 8601 date
  readonly residencyStartDate?: string; // ISO 8601 date
  readonly hasFelon?: boolean;
  readonly feloRestorationDate?: string;
  readonly isRegistered?: boolean;
}

export interface EligibilityResult {
  readonly status: EligibilityStatus;
  readonly reasons: EligibilityReason[];
  readonly nextSteps: string[];
  readonly registrationUrl?: string;
  readonly checkRequired: boolean;
}

export interface EligibilityReason {
  readonly passed: boolean;
  readonly rule: string;
  readonly explanation: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly requestId: string;
  readonly timestamp: string;
}

export interface PaginatedResponse<T> {
  readonly data: T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
  readonly total?: number;
}

export interface ApiSuccess<T> {
  readonly data: T;
  readonly requestId: string;
  readonly timestamp: string;
}

// ─── Analytics (privacy-preserving) ──────────────────────────────────────────

export type AnalyticsEvent =
  | "guide_started"
  | "guide_completed"
  | "guide_step_completed"
  | "quiz_attempted"
  | "quiz_completed"
  | "ai_question_asked"
  | "content_bookmarked"
  | "eligibility_checked"
  | "calendar_added"
  | "language_switched";

export interface AnalyticsPayload {
  readonly event: AnalyticsEvent;
  readonly countryCode?: string;
  readonly language: LanguageCode;
  readonly sessionId: string; // anonymized
  readonly timestamp: string;
  readonly properties?: Record<string, string | number | boolean>;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationPayload {
  readonly title: string;
  readonly body: string;
  readonly icon?: string;
  readonly data: {
    readonly type: "election_reminder" | "registration_deadline" | "result";
    readonly countryCode: string;
    readonly actionUrl: string;
  };
}

// ─── RAG Pipeline ─────────────────────────────────────────────────────────────

export interface DocumentChunk {
  readonly chunkId: string;
  readonly documentId: string;
  readonly content: string;
  readonly tokenCount: number;
  readonly embedding?: number[];
  readonly metadata: {
    readonly countryCode: string;
    readonly sourceUrl: string;
    readonly chunkIndex: number;
    readonly totalChunks: number;
  };
}

export interface RAGContext {
  readonly chunks: DocumentChunk[];
  readonly totalTokens: number;
  readonly query: string;
  readonly retrievedAt: string;
}

// ─── Wizard State Machine ─────────────────────────────────────────────────────

export type WizardStep =
  | "country_selection"
  | "eligibility_check"
  | "registration_guide"
  | "id_requirements"
  | "polling_location"
  | "voting_day_procedure"
  | "post_vote";

export interface WizardContext {
  readonly countryCode: string;
  readonly stateCode?: string;
  readonly eligibilityResult?: EligibilityResult;
  readonly selectedLanguage: LanguageCode;
  readonly completedSteps: WizardStep[];
  readonly currentStep: WizardStep;
  readonly stepData: Partial<WizardStepData>;
}

export interface WizardStepData {
  readonly country: { countryCode: string; stateCode?: string };
  readonly eligibility: EligibilityInput;
  readonly registration: { registrationUrl: string; deadline: string };
  readonly idRequirements: { acceptedIds: string[] };
  readonly pollingLocation: { address?: string; findUrl: string };
  readonly votingDay: { openTime: string; closeTime: string };
  readonly postVote: { resultDateEstimate: string };
}
