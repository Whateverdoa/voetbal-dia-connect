#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";

const root = process.cwd();
const scanDirs = ["src", "convex"];
const bannedPatterns = [
  /\bcoachPin\b/g,
  /\bby_pin\b/g,
  /\bverifyCoachPin\b/g,
  /\bCLERK_COACH_EMAIL_PIN\b/g,
  /\blinkedPin(s)?\b/g,
];

const isIgnoredFile = (filePath) => {
  const rel = filePath.replaceAll("\\", "/");
  return (
    rel.includes("/_generated/") ||
    rel.includes(".test.") ||
    rel.endsWith("/convex/schema.ts") ||
    rel.endsWith("/convex/adminMigrations.ts") ||
    rel.endsWith(".md") ||
    rel.endsWith(".plan.md")
  );
};

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );
  return files.flat();
}

async function main() {
  const violations = [];

  for (const scanDir of scanDirs) {
    const absDir = path.join(root, scanDir);
    const files = await walk(absDir);
    for (const filePath of files) {
      if (isIgnoredFile(filePath)) continue;
      const text = await fs.readFile(filePath, "utf8");
      for (const pattern of bannedPatterns) {
        if (pattern.test(text)) {
          violations.push({
            file: path.relative(root, filePath).replaceAll("\\", "/"),
            pattern: pattern.toString(),
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("PIN dependency guard failed. Found banned patterns:");
    for (const violation of violations) {
      console.error(`- ${violation.file} (${violation.pattern})`);
    }
    process.exit(1);
  }

  console.log("PIN dependency guard passed.");
}

main().catch((error) => {
  console.error("PIN dependency guard crashed:", error);
  process.exit(1);
});
