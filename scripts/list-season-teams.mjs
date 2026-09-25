import { execFileSync } from "child_process";
import { readFileSync } from "fs";

const csv = readFileSync("docs/Teamindelingen_26-27.csv", "utf8");
const listed = new Set();
for (const line of csv.split(/\r?\n/).slice(1)) {
  const team = line.split(",")[0]?.trim();
  if (team) listed.add(team.toLowerCase());
}
listed.add("jo13-2");

const query = `
const teams = await ctx.db.query("teams").collect();
return teams.map((t) => t.slug).sort();
`;
const raw = execFileSync(
  process.execPath,
  ["node_modules/convex/bin/main.js", "run", "--typecheck", "disable", "--inline-query", query],
  { encoding: "utf8" },
);
const db = JSON.parse(raw.slice(raw.indexOf("[")));
const listedArr = [...listed].sort();
const extra = db.filter((s) => !listed.has(s));
const missing = listedArr.filter((s) => !db.includes(s));
console.log(`CSV+JO13-2 teams: ${listedArr.length}`);
console.log(`DB teams: ${db.length}`);
console.log("missing in DB:", missing.join(", ") || "-");
console.log("in DB not in 26-27:", extra.join(", ") || "-");
