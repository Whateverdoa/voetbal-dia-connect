import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "weekend-results-hourly",
  "0 8-20 * * 6,0",
  internal.import.weeklyUpdate.runIfMatchesEnded,
);

export default crons;
