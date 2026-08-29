import { rankMedia } from "../lib/media-selection.ts";

const base = {
  mime_type: "image/webp",
  width: 1600,
  height: 1000,
  duration_ms: null,
  size_bytes: 100_000,
  orientation: "landscape",
  subjects: "membri la eveniment",
  mood: "energic documentar",
  tags: ["event", "community", "group"],
  quality_score: 0.9,
  sharpness_score: 0.85,
  crop_safe: true,
  faces_visible: true,
  focal_x: 0.5,
  focal_y: 0.5,
  alt_text: "Membri Interact la un eveniment",
  archived: false,
  excluded: false,
  storage_path: null,
  sha256: null,
  generation_tool: null,
  generation_prompt: null,
  generation_job_id: null,
  poster_asset_id: null,
  created_by: null,
  updated_at: "2026-08-03T00:00:00Z",
};

const assets = [
  { ...base, id: "real", file_name: "real.webp", public_url: "/real.webp", source_kind: "real_photo", category: "Events", created_at: "2026-08-01T00:00:00Z" },
  { ...base, id: "generated", file_name: "generated.webp", public_url: "/generated.webp", source_kind: "higgsfield", category: "Events", created_at: "2026-08-02T00:00:00Z" },
  { ...base, id: "excluded", file_name: "excluded.webp", public_url: "/excluded.webp", source_kind: "real_photo", category: "Events", excluded: true, created_at: "2026-08-03T00:00:00Z" },
];

const context = {
  category: "Events",
  orientation: "landscape",
  tags: ["event", "community"],
  mood: "documentar",
  preferFaces: true,
  needsSafeCrop: true,
};

const first = rankMedia(assets, context);
if (first[0]?.asset.id !== "real") throw new Error("Authentic photograph should rank ahead of a matching generated asset.");
if (first.some((item) => item.asset.id === "excluded")) throw new Error("Excluded assets must never be recommended.");
if (!first[0].reasons.includes("fotografie autentică")) throw new Error("Recommendation must explain authentic-photo preference.");

const repeated = rankMedia(assets, context, { real: 2 });
if (repeated[0]?.asset.id !== "generated") throw new Error("Reuse penalty should diversify recommendations when relevance is otherwise equal.");

console.log(JSON.stringify({
  passed: true,
  checks: ["authentic-first", "excluded-filtered", "explanation-present", "reuse-diversity"],
  firstRanking: first.map((item) => ({ id: item.asset.id, score: item.score, reasons: item.reasons })),
  repeatedRanking: repeated.map((item) => ({ id: item.asset.id, score: item.score })),
}, null, 2));
