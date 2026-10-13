import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Usage: node scripts/export-shields.mjs <generation-receipts.json>
// Only resizes/encodes outputs; the artwork and original alpha are preserved.
const receiptsPath = process.argv[2];
if (!receiptsPath) throw new Error("Pass the generation receipts JSON path.");
const receipts = JSON.parse(await fs.readFile(receiptsPath, "utf8"));
const output = path.resolve("public/cards/shields");
await fs.mkdir(output, { recursive: true });
const assets = [];

for (const { id, source, prompt } of receipts) {
  if (!/^(bronze|silver|gold|dia|crystal|elite)$/.test(id)) throw new Error(`Unknown shield: ${id}`);
  // Add a uniform transparent safety margin without cropping the generated art.
  const original = await sharp(source).metadata();
  const horizontalPadding = Math.ceil(original.width * 0.03);
  const verticalPadding = Math.ceil(original.height * 0.03);
  const padded = await sharp(source).extend({ left: horizontalPadding, right: horizontalPadding, top: verticalPadding, bottom: verticalPadding, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const input = sharp(padded);
  const metadata = await input.metadata();
  if (!metadata.hasAlpha) throw new Error(`${id}: missing alpha channel`);
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
  const corners = [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]];
  if (corners.some(([x, y]) => alphaAt(x, y) !== 0)) throw new Error(`${id}: exterior corners are not transparent`);
  if (alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2)) < 250) throw new Error(`${id}: interior is not opaque`);
  let transparent = 0;
  const bounds = { left: info.width, top: info.height, right: 0, bottom: 0 };
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = alphaAt(x, y);
      if (alpha === 0) transparent += 1;
      if (alpha > 128) {
        bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
        bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
      }
    }
  }
  const transparentFraction = transparent / (info.width * info.height);
  if (transparentFraction < 0.05) throw new Error(`${id}: insufficient transparent exterior`);
  if (Math.abs(info.width / info.height - 0.75) > 0.005) throw new Error(`${id}: expected 3:4 canvas`);
  const basename = `dia-shield-${id}-v1`;
  await fs.writeFile(path.join(output, `${basename}.png`), padded);
  await sharp(padded).resize({ width: 768, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, `${basename}.webp`));
  assets.push({ id, png: `${basename}.png`, webp: `${basename}.webp`, width: info.width, height: info.height, transparentFraction: Number(transparentFraction.toFixed(3)), bounds, prompt });
}

await fs.writeFile(path.join(output, "manifest.json"), `${JSON.stringify({ version: 1, tool: "Built-in Codex ImageGen", assets }, null, 2)}\n`);
console.log(JSON.stringify(assets.map(({ id, width, height, transparentFraction, bounds }) => ({ id, width, height, transparentFraction, bounds })), null, 2));
