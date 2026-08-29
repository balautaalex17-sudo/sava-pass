import { IMMERSIVE_CSS } from "../_immersive/content";
import { BOARD_SHOWCASE_CSS, LANDING_REFINEMENT_CSS } from "../_immersive/upgrade";

export const dynamic = "force-static";

const stylesheet = `${IMMERSIVE_CSS}\n${LANDING_REFINEMENT_CSS}\n${BOARD_SHOWCASE_CSS}`;

export function GET() {
  return new Response(stylesheet, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "text/css; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
