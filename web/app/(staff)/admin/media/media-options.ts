export const MEDIA_CATEGORIES = [
  "Hero",
  "Events",
  "Recruitment",
  "Interviews",
  "Members",
  "Venues",
  "Backgrounds",
  "Motion",
  "Generated",
  "Archived",
  "General",
] as const;

export const MEDIA_ORIENTATIONS = ["landscape", "portrait", "square"] as const;

export function sourceLabel(source: string) {
  return ({ real_photo: "Reală", edited_photo: "Editată", higgsfield: "Higgsfield", video: "Video", fallback: "Fallback" } as Record<string, string>)[source] ?? source;
}
