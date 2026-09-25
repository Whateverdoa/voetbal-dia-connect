import { execFileSync } from "child_process";

const query = `
const slugs = ["jo17-3","jo23-2","mo20-1","jo13-2","jo8-5","jo11-5","jo16-3","jo8-6","mo13-1","zo1"];
const teams = await ctx.db.query("teams").collect();
const details = [];
for (const slug of slugs) {
  const team = teams.find((row) => row.slug === slug);
  if (!team) {
    details.push({ slug, missing: true });
    continue;
  }
  const players = await ctx.db
    .query("players")
    .withIndex("by_team", (q) => q.eq("teamId", team._id))
    .collect();
  const activePlayers = players.filter((player) => player.active);
  details.push({
    slug,
    name: team.name,
    active: team.active ?? null,
    players: activePlayers.length,
    jo132: slug === "jo13-2" ? activePlayers.map((player) => player.name).sort() : undefined,
  });
}
return {
  youthVisible: teams
    .filter((team) => team.active !== false && /^(jo|mo)\\d/i.test(team.slug))
    .map((team) => team.slug)
    .sort(),
  leftover: teams.filter((team) => team.active === false).map((team) => team.slug).sort(),
  details,
};
`;

const raw = execFileSync(
  process.execPath,
  ["node_modules/convex/bin/main.js", "run", "--typecheck", "disable", "--inline-query", query],
  { encoding: "utf8" },
);
console.log(raw.slice(raw.indexOf("{")));
