import { z } from "zod";

export const languageIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{1,31}$/);

export const proficiencyContextSchema = z.object({
  framework: z.enum(["cefr", "jlpt", "custom"]),
  level: z.string().trim().min(1).max(24)
}).strict();

export const correctionCategorySchema = z.enum([
  "grammar",
  "tense_aspect",
  "agreement",
  "conjugation",
  "word_order",
  "article_determiner",
  "preposition",
  "pronoun",
  "vocabulary",
  "collocation",
  "idiom_naturalness",
  "spelling",
  "punctuation",
  "register",
  "script",
  "other"
]);

export const correctionSeveritySchema = z.enum([
  "minor",
  "major"
]);

export const correctionConfidenceSchema = z.enum([
  "high",
  "medium",
  "low"
]);

export const correctionErrorSchema = z.object({
  id: z.string().trim().min(1).max(24),
  category: correctionCategorySchema,
  severity: correctionSeveritySchema,
  original: z.string().max(1_000),
  correction: z.string().max(1_000),
  explanation: z.string().trim().min(1).max(1_200),
  confidence: correctionConfidenceSchema
}).strict();

export const naturalnessSuggestionSchema = z.object({
  original: z.string().max(1_000),
  suggestion: z.string().max(1_000),
  reason: z.string().trim().min(1).max(800)
}).strict();

export const explanationExampleSchema = z.object({
  target: z.string().trim().min(1).max(500),
  meaning: z.string().trim().min(1).max(500).nullable(),
  note: z.string().trim().min(1).max(500).nullable()
}).strict();

export type ProficiencyContext =
  z.infer<typeof proficiencyContextSchema>;
export type CorrectionCategory =
  z.infer<typeof correctionCategorySchema>;
