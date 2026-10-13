import fs from "node:fs/promises";
import sharp from "sharp";

const output = "output/shields";
const abstract = process.argv.includes("--abstract");
const collection = abstract ? "DIA-abstracte-schilden-26-27" : "DIA-schildencollectie-26-27";
await fs.mkdir(output, { recursive: true });
const themes = [["bronze", "BRONS"], ["silver", "ZILVER"], ["gold", "GOUD"], ["dia", "DIA"], ["crystal", "KRISTAL"], ["elite", "ELITE"]];
const labels = themes.map(([, label], i) => `<text x="${240 + i % 3 * 400}" y="${700 + Math.floor(i / 3) * 570}" fill="#e1e9ec" text-anchor="middle" font-size="20" font-family="Arial" letter-spacing="4">${label}</text>`).join("");
const background = Buffer.from(`<svg width="1280" height="1370" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="1370" fill="#0c1319"/><text x="60" y="62" fill="#89d6ad" font-family="Arial" font-size="16" letter-spacing="5">DIA LIVE / ${abstract ? "ABSTRACT" : "COLLECTIE"} 26–27</text><text x="60" y="115" fill="white" font-family="Arial" font-size="38" font-weight="bold">${abstract ? "Rustige vormen. Een eigen karakter." : "Zes schilden. Alle ruimte voor jouw team."}</text>${labels}<text x="640" y="1340" fill="#9caab3" font-family="Arial" font-size="15" text-anchor="middle">${abstract ? "BEWERKBARE SVG · TRANSPARANTE PNG · GEDEELDE VORM EN KLEUREN" : "LEGE ONTWERPEN · TRANSPARANTE PNG · ZONDER SPELERSFOTO OF SHIRT"}</text></svg>`);
const layers = await Promise.all(themes.map(async ([id], i) => ({ input: await sharp(`public/cards/shields/${abstract ? `abstract/dia-shield-${id}-abstract-v1` : `dia-shield-${id}-v1`}.png`).resize(360, 480).png().toBuffer(), left: 60 + i % 3 * 400, top: 180 + Math.floor(i / 3) * 570 })));
await sharp(background).composite(layers).png().toFile(`${output}/${collection}.png`);
console.log(`${output}/${collection}.png`);
