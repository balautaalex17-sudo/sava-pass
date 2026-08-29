import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const events = JSON.parse(await fs.readFile(path.join(projectRoot, "data", "instagram-events.generated.json"), "utf8"));
const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, "data", "instagram-media-manifest.generated.json"), "utf8"));
const manifestBySource = new Map(manifest.map((item) => [item.src, item]));
const published = events.filter((event) => event.publishingStatus === "published" && Number(event.startDate?.slice(0, 4)) >= 2023 && Number(event.startDate?.slice(0, 4)) <= 2026);
const coverHashes = new Map();

function hammingDistance(a, b) {
  const left = BigInt(`0x${a}`);
  const right = BigInt(`0x${b}`);
  let bits = left ^ right;
  let count = 0;
  while (bits) {
    count += Number(bits & 1n);
    bits >>= 1n;
  }
  return count;
}

for (const event of published) {
  if (!event.coverImage?.src) continue;
  const media = manifestBySource.get(event.coverImage.src);
  if (!media) throw new Error(`Lipsește manifestul media pentru ${event.slug}: ${event.coverImage.src}`);
  const filePath = path.join(projectRoot, "public", ...event.coverImage.src.split("/").filter(Boolean));
  const buffer = await fs.readFile(filePath);
  const actualHash = createHash("sha256").update(buffer).digest("hex");
  if (actualHash !== media.sha256) throw new Error(`Hash-ul fișierului nu corespunde manifestului: ${event.coverImage.src}`);
  if (coverHashes.has(actualHash)) throw new Error(`Aceeași imagine de copertă este folosită de ${coverHashes.get(actualHash)} și ${event.slug}.`);
  coverHashes.set(actualHash, event.slug);
}

for (let left = 0; left < manifest.length; left += 1) {
  for (let right = left + 1; right < manifest.length; right += 1) {
    if (manifest[left].sha256 === manifest[right].sha256) throw new Error(`Duplicat media exact: ${manifest[left].src} și ${manifest[right].src}`);
    if (hammingDistance(manifest[left].perceptualDHash, manifest[right].perceptualDHash) <= 3) {
      throw new Error(`Posibil duplicat vizual: ${manifest[left].src} și ${manifest[right].src}`);
    }
  }
}

console.log(`Media verificată: ${manifest.length} fișiere, ${coverHashes.size} coperți publicate, fără reutilizări sau hash-uri duplicate.`);
