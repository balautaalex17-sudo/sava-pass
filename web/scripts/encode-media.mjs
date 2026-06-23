import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

// Read canonical PNGs from the same source the extractor uses (kept out of the
// app/deploy); write sized WebP into public/imersiv (the only copy shipped).
const SRC_DIR = "C:/Users/cycla/Documents/Bussines/projects/Sava Pass #2/assets";
const DIR = "public/imersiv";
// Images actually referenced by the homepage (orphans intentionally excluded).
const IMAGES = [
  "echoes-unplugged.png","event-easter.png","event-cupid.png",
  "year-2024.png","year-2025.png","year-2026.png",
  "team-interact.png","stat-community.png","stat-concert.png","stat-scan.png",
];
const MAXW = 1200, Q = 80;
let before = 0, after = 0;
for (const name of IMAGES) {
  const src = path.join(SRC_DIR, name);
  if (!fs.existsSync(src)) { console.log("skip (missing):", name); continue; }
  const out = path.join(DIR, name.replace(/\.png$/, ".webp"));
  const b = fs.statSync(src).size;
  const meta = await sharp(src).metadata();
  const w = Math.min(meta.width || MAXW, MAXW);
  await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: Q }).toFile(out);
  const a = fs.statSync(out).size;
  before += b; after += a;
  console.log(`${name.padEnd(24)} ${(b/1048576).toFixed(2)}MB -> ${(a/1024).toFixed(0)}KB (${meta.width}->${w}px)`);
}
console.log(`\nTOTAL images: ${(before/1048576).toFixed(2)}MB -> ${(after/1048576).toFixed(2)}MB  (${(100-after/before*100).toFixed(0)}% smaller)`);
