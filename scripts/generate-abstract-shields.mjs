import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Source of truth: edit design-tokens.json, then regenerate every export.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "public/cards/shields/abstract");
const design = JSON.parse(await fs.readFile(path.join(output, "design-tokens.json"), "utf8"));
const { canvas, geometry, themes } = design;
const assets = [];

for (const theme of themes) {
  const facets = geometry.facets.map((d, i) => `<path d="${d}" fill="${theme.facet}" opacity="${i === 0 ? 0.32 : 0.18}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <defs>
    <linearGradient id="surface" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="${theme.elevated}"/><stop offset="1" stop-color="${theme.base}"/></linearGradient>
    <clipPath id="shield"><path d="${geometry.outline}"/></clipPath>
  </defs>
  <path d="${geometry.outline}" fill="url(#surface)"/>
  <g clip-path="url(#shield)">${facets}</g>
  <path d="${geometry.outline}" fill="none" stroke="${theme.accent}" stroke-width="${geometry.edgeWidth}" stroke-linejoin="round"/>
  <path d="${geometry.inset}" fill="none" stroke="${theme.accent}" stroke-width="${geometry.insetWidth}" opacity="0.22" stroke-linejoin="round"/>
</svg>\n`;
  const basename = `dia-shield-${theme.id}-abstract-v1`;
  await fs.writeFile(path.join(output, `${basename}.svg`), svg);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
  if (info.channels !== 4 || alpha(0, 0) !== 0 || alpha(info.width - 1, info.height - 1) !== 0 || alpha(info.width / 2, info.height / 2) !== 255) {
    throw new Error(`Invalid alpha for ${theme.id}`);
  }
  await fs.writeFile(path.join(output, `${basename}.png`), png);
  await sharp(png).resize(768, 1024).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, `${basename}.webp`));
  assets.push({ id: theme.id, name: theme.name, svg: `${basename}.svg`, png: `${basename}.png`, webp: `${basename}.webp`, ...canvas });
}

await fs.writeFile(path.join(output, "manifest.json"), `${JSON.stringify({ version: design.version, source: "design-tokens.json", generator: "scripts/generate-abstract-shields.mjs", contentInsetsPercent: design.contentInsetsPercent, footballContentInsetsPercent: design.footballContentInsetsPercent, assets }, null, 2)}\n`);
console.log(`Generated and alpha-checked ${assets.length} abstract shields (SVG, PNG, WebP).`);
