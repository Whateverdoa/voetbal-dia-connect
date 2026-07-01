import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Weekend: elk uur UTC 8-20 op za+zo (= Amsterdam 10:00-22:00 in CEST, 09:00-21:00 in CET).
crons.cron(
  "weekend-results-hourly",
  "0 8-20 * * 6,0",
  internal.import.weeklyUpdate.runIfMatchesEnded,
);

// Midweek: elk uur UTC 17-21 op ma-vr voor doordeweekse avond-/inhaalwedstrijden
// (= Amsterdam 19:00-23:00 in CEST, 18:00-22:00 in CET). Gate skipt als er niks gespeeld is.
crons.cron(
  "midweek-evening-results",
  "0 17-21 * * 1-5",
  internal.import.weeklyUpdate.runIfMatchesEnded,
);

export default crons;
