import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Sportlink programma → matches (tijdverzettingen, nieuwe fixtures).
 * 2× per dag: 11:00 UTC (~13:00 NL-zomer) en 17:00 UTC (~19:00 NL-zomer).
 */
crons.cron(
  "sportlink-programma-midday",
  "0 11 * * *",
  internal.import.programmaSync.runDailyProgrammaSync,
);

crons.cron(
  "sportlink-programma-evening",
  "0 17 * * *",
  internal.import.programmaSync.runDailyProgrammaSync,
);

// Weekend: elk uur UTC 8-20 op za+zo (= Amsterdam 10:00-22:00 in CEST).
crons.cron(
  "weekend-results-hourly",
  "0 8-20 * * 6,0",
  internal.import.weeklyUpdate.runIfMatchesEnded,
);

// Midweek: elk uur UTC 17-21 op ma-vr voor doordeweekse avond-/inhaalwedstrijden.
crons.cron(
  "midweek-evening-results",
  "0 17-21 * * 1-5",
  internal.import.weeklyUpdate.runIfMatchesEnded,
);

/**
 * Bond poulestanden. Na de weekendronde (zo 20:00 UTC) en midweek als vangnet,
 * zodat ouders maandagochtend de bijgewerkte stand zien.
 */
crons.cron(
  "sportlink-standings-weekend",
  "0 20 * * 0",
  internal.import.sportlinkStandingsFetch.syncStandings,
);

crons.cron(
  "sportlink-standings-midweek",
  "0 20 * * 3",
  internal.import.sportlinkStandingsFetch.syncStandings,
);

/** Auto-close expired claim windows + optional closing reminders (daily 12:00 UTC). */
crons.cron(
  "referee-claim-window-daily",
  "0 12 * * *",
  internal.refereeNotifications.createWindowClosingReminders,
);

export default crons;
