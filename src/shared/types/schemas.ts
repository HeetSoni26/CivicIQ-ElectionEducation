// Zod schemas for runtime validation at all API boundaries
import { z } from "zod";

export const LanguageCodeSchema = z.enum([
  "en",
  "es",
  "fr",
  "hi",
  "ar",
  "de",
  "pt",
  "zh",
  "ja",
  "ko",
]);

export const CountryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/);

export const EligibilityInputSchema = z.object({
  countryCode: CountryCodeSchema,
  stateCode: z.string().optional(),
  birthDate: z.string().datetime(),
  electionDate: z.string().datetime(),
  isCitizen: z.boolean(),
  citizenshipDate: z.string().datetime().optional(),
  residencyStartDate: z.string().datetime().optional(),
  hasFelon: z.boolean().optional(),
  feloRestorationDate: z.string().datetime().optional(),
  isRegistered: z.boolean().optional(),
});

export const ChatMessageSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(2000)
    .transform((s) =>
      s
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim()
    ),
  sessionId: z.string().uuid(),
  countryCode: CountryCodeSchema.optional(),
  language: LanguageCodeSchema.default("en"),
});

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const QuizAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid(),
  timeSpentSeconds: z.number().int().min(0).max(3600),
});

export const NotificationSubscriptionSchema = z.object({
  fcmToken: z.string().min(1),
  countryCode: CountryCodeSchema,
  topics: z.array(z.string()).min(1).max(10),
});

export const AnalyticsEventSchema = z.object({
  event: z.enum([
    "guide_started",
    "guide_completed",
    "guide_step_completed",
    "quiz_attempted",
    "quiz_completed",
    "ai_question_asked",
    "content_bookmarked",
    "eligibility_checked",
    "calendar_added",
    "language_switched",
  ]),
  countryCode: CountryCodeSchema.optional(),
  language: LanguageCodeSchema,
  sessionId: z.string(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

// Type exports inferred from schemas
export type EligibilityInputValidated = z.infer<typeof EligibilityInputSchema>;
export type ChatMessageValidated = z.infer<typeof ChatMessageSchema>;
export type AnalyticsEventValidated = z.infer<typeof AnalyticsEventSchema>;
