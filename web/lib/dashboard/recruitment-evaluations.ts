import { isMajorityGreen } from "@/lib/recruitment-spec";

export type ApplicationRating = "green" | "yellow" | "red";

export type BulkInterviewFilter = "green" | "green_yellow";

export type FormDecision = "interview" | "not_selected" | "unrated";

/**
 * Returns the arithmetic mean of the completed scores in a collection.
 * Missing scores do not count; an empty collection has no mean.
 */
export function arithmeticMean(
  scores: readonly (number | null | undefined)[],
): number | null {
  const completed = scores.filter(
    (score): score is number => typeof score === "number" && Number.isFinite(score),
  );
  if (!completed.length) return null;
  return completed.reduce((total, score) => total + score, 0) / completed.length;
}

export type MeanSortable = { fullName: string; mean: number | null };

const romanianNameCollator = new Intl.Collator("ro", { sensitivity: "base" });

function lastName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? "";
}

/** Compares Romanian names by last name, then by the complete name. */
export function compareByLastName(left: string, right: string): number {
  const lastNameOrder = romanianNameCollator.compare(lastName(left), lastName(right));
  return lastNameOrder || romanianNameCollator.compare(left, right);
}

/** Sorts completed means first in ascending order, then Romanian names.
 *
 * Kept for the legacy interview workspace. Form centralizers use the
 * descending comparator below, because the strongest candidates belong first.
 */
export function compareByAscendingMean(left: MeanSortable, right: MeanSortable): number {
  if (left.mean === null && right.mean !== null) return 1;
  if (left.mean !== null && right.mean === null) return -1;
  if (left.mean !== null && right.mean !== null && left.mean !== right.mean) {
    return left.mean - right.mean;
  }
  return left.fullName.localeCompare(right.fullName, "ro", { sensitivity: "base" });
}

/** Sorts completed means highest first, with missing means last. */
export function compareByDescendingMean(left: MeanSortable, right: MeanSortable): number {
  if (left.mean === null && right.mean !== null) return 1;
  if (left.mean !== null && right.mean === null) return -1;
  if (left.mean !== null && right.mean !== null && left.mean !== right.mean) {
    return right.mean - left.mean;
  }
  return compareByLastName(left.fullName, right.fullName);
}

export const compareByMeanDescending = compareByDescendingMean;
export const compareInterviewMeans = compareByAscendingMean;
export const averageInterviewScore = arithmeticMean;

/** Sorts individual evaluator scores highest first, with missing scores last. */
export function compareByDescendingScore(
  left: number | null | undefined,
  right: number | null | undefined,
): number {
  const leftFinite = typeof left === "number" && Number.isFinite(left);
  const rightFinite = typeof right === "number" && Number.isFinite(right);
  if (!leftFinite && rightFinite) return 1;
  if (leftFinite && !rightFinite) return -1;
  if (!leftFinite && !rightFinite) return 0;
  return (right as number) - (left as number);
}

/** Classifies a candidate without inventing a decision for unrated forms. */
export function classifyFormDecision(ratings: readonly ApplicationRating[]): FormDecision {
  if (ratings.length === 0) return "unrated";
  return isMajorityGreen([...ratings]) ? "interview" : "not_selected";
}

export const classifyRecruitmentDecision = classifyFormDecision;
export const formDecisionForRatings = classifyFormDecision;

export function matchesBulkInterviewFilter(
  ratings: ApplicationRating[],
  filter: BulkInterviewFilter,
) {
  if (ratings.length === 0) return false;

  if (filter === "green") {
    return isMajorityGreen(ratings);
  }

  return isMajorityGreen(ratings) && ratings.every((rating) => rating !== "red");
}
