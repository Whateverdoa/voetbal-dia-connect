import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

<<<<<<< HEAD
/**
 * Sportlink programma → matches (tijdverzettingen, nieuwe fixtures).
 * 2× per dag: 11:00 UTC (~13:00 NL-zomer) en 17:00 UTC (~19:00 NL-zomer),
 * zodat wijzigingen op de dag zelf nog meegenomen worden.
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

/**
 * Weekend uitslagen: elk uur 08–20 UTC op za/zo, alleen als er al een
 * wedstrijd die dag is afgelopen.
 */
=======
// Weekend: elk uur UTC 8-20 op za+zo (= Amsterdam 10:00-22:00 in CEST, 09:00-21:00 in CET).
>>>>>>> origin/main
crons.cron(
  "weekend-results-hourly",
  "0 8-20 * * 6,0",
  internal.import.weeklyUpdate.runIfMatchesEnded,
);

<<<<<<< HEAD
/** Auto-close expired claim windows + optional closing reminders (daily 12:00 UTC). */
crons.cron(
  "referee-claim-window-daily",
  "0 12 * * *",
  internal.refereeNotifications.createWindowClosingReminders,
=======
// Midweek: elk uur UTC 17-21 op ma-vr voor doordeweekse avond-/inhaalwedstrijden
// (= Amsterdam 19:00-23:00 in CEST, 18:00-22:00 in CET). Gate skipt als er niks gespeeld is.
crons.cron(
  "midweek-evening-results",
  "0 17-21 * * 1-5",
  internal.import.weeklyUpdate.runIfMatchesEnded,
>>>>>>> origin/main
);

export default crons;
