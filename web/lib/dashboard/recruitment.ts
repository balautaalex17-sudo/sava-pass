import type { Json, RecruitmentField } from "@/lib/supabase/types";

export interface CompletionResult {
  completionPercentage: number;
  isComplete: boolean;
  missingRequiredFields: string[];
}

type AnswerMap = Record<string, unknown>;

function textValue(value: unknown): string {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

function conditionApplies(rules: Json | null, answers: AnswerMap): boolean {
  if (!rules || Array.isArray(rules) || typeof rules !== "object") return true;
  const field = typeof rules.field === "string" ? rules.field : null;
  if (!field) return true;
  const actual = textValue(answers[field]);
  const operator = typeof rules.operator === "string" ? rules.operator : "equals";
  const expected = rules.value;
  if (operator === "equals") return actual === textValue(expected);
  if (operator === "not_equals") return actual !== textValue(expected);
  if (operator === "not_empty") return actual.trim() !== "";
  if (operator === "in") return Array.isArray(expected) && expected.map(textValue).includes(actual);
  return false;
}

export function calculateRecruitmentCompletion(
  fields: Pick<RecruitmentField, "key" | "label" | "source_header" | "required" | "conditional_rules">[],
  answers: AnswerMap,
  sourcePayload: AnswerMap = {},
): CompletionResult {
  const required = fields.filter((field) => field.required && conditionApplies(field.conditional_rules, answers));
  const missing = required.filter((field) => textValue(answers[field.key] ?? sourcePayload[field.source_header]).trim() === "").map((field) => field.label);
  const answered = required.length - missing.length;
  return {
    completionPercentage: required.length ? Math.floor((answered / required.length) * 100) : 100,
    isComplete: missing.length === 0,
    missingRequiredFields: missing,
  };
}

export function applicationFieldValue(
  field: Pick<RecruitmentField, "key" | "source_header">,
  answers: AnswerMap,
  sourcePayload: AnswerMap,
): string {
  return textValue(sourcePayload[field.source_header] ?? answers[field.key]);
}
