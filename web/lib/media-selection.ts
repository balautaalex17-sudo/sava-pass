import type { MediaAsset } from "@/lib/supabase/types";

export interface MediaSelectionContext {
  category: MediaAsset["category"];
  orientation: MediaAsset["orientation"];
  tags?: string[];
  mood?: string;
  preferFaces?: boolean;
  needsSafeCrop?: boolean;
}

export interface MediaRecommendation {
  asset: MediaAsset;
  score: number;
  reasons: string[];
}

/** Deterministic ranking over stored analysis. It never calls a model during rendering. */
export function rankMedia(
  assets: MediaAsset[],
  context: MediaSelectionContext,
  usageCount: Record<string, number> = {},
): MediaRecommendation[] {
  const wantedTags = new Set((context.tags ?? []).map((tag) => tag.toLowerCase()));

  return assets
    .filter((asset) => !asset.archived && !asset.excluded)
    .map((asset) => {
      let score = 0;
      const reasons: string[] = [];
      const assetTags = new Set(asset.tags.map((tag) => tag.toLowerCase()));

      if (asset.category === context.category) {
        score += 28;
        reasons.push(`categoria ${context.category}`);
      }
      if (asset.orientation === context.orientation) {
        score += 18;
        reasons.push(`format ${context.orientation}`);
      }
      const matches = [...wantedTags].filter((tag) => assetTags.has(tag));
      if (matches.length) {
        score += Math.min(18, matches.length * 6);
        reasons.push(`relevant pentru ${matches.join(", ")}`);
      }
      if (context.mood && asset.mood?.toLowerCase().includes(context.mood.toLowerCase())) {
        score += 8;
        reasons.push("ton emoțional potrivit");
      }
      if (!context.preferFaces || asset.faces_visible) {
        score += context.preferFaces ? 7 : 3;
        if (context.preferFaces) reasons.push("fețe vizibile");
      }
      if (!context.needsSafeCrop || asset.crop_safe) {
        score += context.needsSafeCrop ? 12 : 4;
        if (context.needsSafeCrop) reasons.push("crop sigur");
      }

      score += Number(asset.quality_score) * 18;
      score += Number(asset.sharpness_score ?? 0.5) * 8;

      if (asset.source_kind === "real_photo") {
        score += 10;
        reasons.push("fotografie autentică");
      } else if (asset.source_kind === "edited_photo") {
        score += 6;
        reasons.push("fotografie autentică editată");
      } else if (asset.source_kind === "higgsfield") {
        score += 2;
      }

      const repeats = usageCount[asset.id] ?? 0;
      score -= repeats * 9;
      if (repeats === 0) reasons.push("nu este repetată în altă zonă");

      return { asset, score: Math.round(score * 10) / 10, reasons };
    })
    .sort((a, b) => b.score - a.score || b.asset.created_at.localeCompare(a.asset.created_at));
}
