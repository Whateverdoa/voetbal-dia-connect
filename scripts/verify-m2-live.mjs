import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONVEX_BIN = path.join(PROJECT_ROOT, "node_modules", ".bin", "convex");
const REQUIRED_AUDIT_EVENTS = [
  "offer_sent",
  "offer_accepted",
  "assignment_confirmed",
];

export function requireCloudDevDeployment(value) {
  const match = /^dev:([a-z0-9-]+)$/i.exec(value?.trim() ?? "");
  if (!match) {
    throw new Error(
      "M2 live verification requires an explicit cloud development deployment"
    );
  }
  return match[1];
}

export function assertSingleSuccessfulConfirmation(results) {
  const successful = results.filter((result) => result.ok);
  const rejected = results.filter((result) => !result.ok);
  if (successful.length !== 1 || rejected.length !== 1) {
    throw new Error(
      `Expected one successful and one rejected confirmation; received ${successful.length} successful and ${rejected.length} rejected`
    );
  }
  return successful[0].value;
}

export function assertRequiredAuditEvents(events) {
  const eventTypes = new Set(events.map((event) => event.eventType));
  const missing = REQUIRED_AUDIT_EVENTS.filter(
    (eventType) => !eventTypes.has(eventType)
  );
  if (missing.length > 0) {
    throw new Error(`Missing M2 audit events: ${missing.join(", ")}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseConvexOutput(stdout, functionName) {
  const output = stdout.trim();
  if (!output) return null;
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(
      `Could not parse Convex output for ${functionName}: ${error.message}`
    );
  }
}

function seedIdentity(key) {
  return {
    subject: `seed-${key}`,
    issuer: "https://convex.test",
    tokenIdentifier: `seed|${key}`,
  };
}

function commandArgs(deploymentName, functionName, args, identity) {
  const values = [
    "run",
    functionName,
    JSON.stringify(args),
    "--deployment",
    deploymentName,
  ];
  if (identity) values.push("--identity", JSON.stringify(identity));
  return values;
}

async function runConvex(deploymentName, functionName, args, identity) {
  const result = await execFileAsync(
    CONVEX_BIN,
    commandArgs(deploymentName, functionName, args, identity),
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  return parseConvexOutput(result.stdout, functionName);
}

async function captureConvex(deploymentName, functionName, args, identity) {
  try {
    return {
      ok: true,
      value: await runConvex(deploymentName, functionName, args, identity),
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error.stderr || error.message || error),
    };
  }
}

function loadAndVerifyTarget() {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(".env.local is required for M2 live verification");
  }
  loadEnvFile(envPath);
  execFileSync(
    process.execPath,
    [path.join(SCRIPT_DIR, "verify-new-app-convex-target.mjs")],
    {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: "inherit",
    }
  );
  return requireCloudDevDeployment(process.env.CONVEX_DEPLOYMENT);
}

async function findEligibleReferee(
  deploymentName,
  clubId,
  needId,
  excludedProfileIds = []
) {
  const excludedProfiles = new Set(excludedProfileIds);
  for (const refereeNumber of [3, 4, 1, 2]) {
    const identity = seedIdentity(`referee-${refereeNumber}`);
    const profile = await runConvex(
      deploymentName,
      "refereeDomain:getMyRefereeProfile",
      { clubId },
      identity
    );
    if (!profile) continue;
    if (excludedProfiles.has(profile.profileId)) continue;
    const eligibility = await runConvex(
      deploymentName,
      "refereeAssignmentQueries:getPlannerCandidateEligibility",
      { needId, refereeProfileId: profile.profileId },
      seedIdentity("planner")
    );
    if (eligibility.eligible) return { identity, profile };
  }
  throw new Error("Synthetic seed contains no eligible referee for the M2 match");
}

async function createVerificationFixture(deploymentName, runId, scenario) {
  const fixture = await runConvex(
    deploymentName,
    "seed/refereeFirstMutations:createM2VerificationFixture",
    { runId, scenario }
  );
  assert(
    fixture.needStatus === "open",
    `Fresh ${scenario} fixture must be open; received ${fixture.needStatus}`
  );
  return fixture;
}

async function sendVerificationOffer({
  deploymentName,
  fixture,
  referee,
  expiresAt,
  correlationId,
}) {
  const offer = await runConvex(
    deploymentName,
    "refereeAssignmentCommands:sendOffer",
    {
      needId: fixture.needId,
      refereeProfileId: referee.profile.profileId,
      expiresAt,
      needVersion: fixture.needVersion,
      correlationId,
    },
    seedIdentity("planner")
  );
  assert(offer.offerStatus === "pending", "Offer was not created as pending");
  return offer;
}

async function registerSyntheticDevice(deploymentName, referee) {
  const existingDevices = await runConvex(
    deploymentName,
    "mobileDevices:listMyDevices",
    {},
    referee.identity
  );
  for (const device of existingDevices.filter(
    (candidate) => candidate.status === "active"
  )) {
    await runConvex(
      deploymentName,
      "mobileDevices:unregisterMyDevice",
      { deviceId: device.deviceId },
      referee.identity
    );
  }
  const apnsToken = createHash("sha256")
    .update(`m2-live:${referee.profile.profileId}`)
    .digest("hex");
  return await runConvex(
    deploymentName,
    "mobileDevices:registerMyDevice",
    { apnsToken, platform: "ios", appVersion: "0.1.0" },
    referee.identity
  );
}

async function verifyReminderScenario(
  deploymentName,
  runId,
  excludedProfileIds
) {
  const fixture = await createVerificationFixture(
    deploymentName,
    runId,
    "reminder"
  );
  const referee = await findEligibleReferee(
    deploymentName,
    fixture.clubId,
    fixture.needId,
    excludedProfileIds
  );
  const device = await registerSyntheticDevice(deploymentName, referee);
  const offer = await sendVerificationOffer({
    deploymentName,
    fixture,
    referee,
    expiresAt: Date.now() + 5 * 60 * 1000,
    correlationId: `${runId}:reminder-offer`,
  });
  const first = await runConvex(
    deploymentName,
    "refereeOfferReminders:queuePendingOfferReminders",
    { limit: 200, reminderWindowMs: 10 * 60 * 1000 }
  );
  assert(first.reminded >= 1, "Pending offer reminder was not marked");
  assert(first.deliveriesQueued >= 1, "Pending offer reminder push was not queued");
  const replay = await runConvex(
    deploymentName,
    "refereeOfferReminders:queuePendingOfferReminders",
    { limit: 200, reminderWindowMs: 10 * 60 * 1000 }
  );
  assert(replay.reminded === 0, "Pending offer reminder was not idempotent");
  const currentOffer = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:getMyOffer",
    { offerId: offer.offerId },
    referee.identity
  );
  assert(currentOffer?.status === "pending", "Reminder changed the offer state");
  await runConvex(
    deploymentName,
    "mobileDevices:unregisterMyDevice",
    { deviceId: device.deviceId },
    referee.identity
  );
  return {
    refereeProfileId: referee.profile.profileId,
    status: currentOffer.status,
    reminded: first.reminded,
    deliveriesQueued: first.deliveriesQueued,
    replayReminded: replay.reminded,
  };
}

async function verifyExpiryScenario(
  deploymentName,
  runId,
  excludedProfileIds
) {
  const fixture = await createVerificationFixture(
    deploymentName,
    runId,
    "expiry"
  );
  const referee = await findEligibleReferee(
    deploymentName,
    fixture.clubId,
    fixture.needId,
    excludedProfileIds
  );
  const offer = await sendVerificationOffer({
    deploymentName,
    fixture,
    referee,
    expiresAt: Date.now() + 2_000,
    correlationId: `${runId}:expiry-offer`,
  });
  await new Promise((resolve) => setTimeout(resolve, 2_500));
  const result = await runConvex(
    deploymentName,
    "refereeOfferExpiry:expirePendingOffers",
    { limit: 200 }
  );
  assert(result.expired >= 1, "Expired offer was not processed");
  assert(result.reopenedNeeds >= 1, "Expired offer did not reopen its need");
  const currentOffer = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:getMyOffer",
    { offerId: offer.offerId },
    referee.identity
  );
  assert(currentOffer?.status === "expired", "Offer is not expired after the job");
  const queue = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listPlannerQueue",
    { clubId: fixture.clubId },
    seedIdentity("planner")
  );
  const reopenedNeed = queue.find((entry) => entry.needId === fixture.needId);
  assert(reopenedNeed?.status === "open", "Expired need is not open again");
  const audit = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listNeedAudit",
    { needId: fixture.needId },
    seedIdentity("planner")
  );
  assert(
    audit.some((event) => event.eventType === "offer_expired"),
    "Expiry audit event is missing"
  );
  return {
    refereeProfileId: referee.profile.profileId,
    offerStatus: currentOffer.status,
    needStatus: reopenedNeed.status,
    expired: result.expired,
    reopenedNeeds: result.reopenedNeeds,
    auditEvents: audit.map((event) => event.eventType),
  };
}

async function verifyAssignedState(
  deploymentName,
  clubId,
  queueEntry,
  refereeIdentity,
  expectedAssignmentId
) {
  const assignments = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listMyAssignments",
    { clubId },
    refereeIdentity
  );
  const matchingAssignments = assignments.filter(
    (assignment) => assignment.needId === queueEntry.needId
  );
  assert(
    matchingAssignments.length === 1,
    `Expected exactly one referee assignment; received ${matchingAssignments.length}`
  );
  assert(
    matchingAssignments[0].assignmentId === expectedAssignmentId,
    "Planner and referee assignment IDs differ"
  );

  const audit = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listNeedAudit",
    { needId: queueEntry.needId },
    seedIdentity("planner")
  );
  assertRequiredAuditEvents(audit);
  return { matchingAssignments, audit };
}

async function main() {
  const deploymentName = loadAndVerifyTarget();
  assert(existsSync(CONVEX_BIN), "Convex CLI is not installed; run npm ci first");
  const runId = `m2-live-${Date.now()}`;
  const fixture = await createVerificationFixture(
    deploymentName,
    runId,
    "assignment"
  );
  const plannerIdentity = seedIdentity("planner");
  const referee = await findEligibleReferee(
    deploymentName,
    fixture.clubId,
    fixture.needId
  );
  const offer = await sendVerificationOffer({
    deploymentName,
    fixture,
    referee,
    expiresAt: Date.now() + 30 * 60 * 1000,
    correlationId: `${runId}:offer`,
  });

  const accepted = await runConvex(
    deploymentName,
    "refereeAssignmentCommands:acceptOffer",
    {
      offerId: offer.offerId,
      offerVersion: offer.offerVersion,
      responseNote: "Synthetic M2 live verification",
      correlationId: `${runId}:accept`,
    },
    referee.identity
  );
  assert(
    accepted.needStatus === "awaiting_confirmation",
    "Acceptance did not leave the need awaiting planner confirmation"
  );

  const beforeConfirmation = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listMyAssignments",
    { clubId: fixture.clubId },
    referee.identity
  );
  assert(
    !beforeConfirmation.some(
      (assignment) => assignment.needId === fixture.needId
    ),
    "Acceptance incorrectly created an assignment before planner confirmation"
  );

  const confirmationArgs = {
    acceptedOfferId: offer.offerId,
    offerVersion: accepted.offerVersion,
    needVersion: accepted.needVersion,
  };
  const confirmationResults = await Promise.all([
    captureConvex(
      deploymentName,
      "refereeAssignmentCommands:confirmAssignment",
      { ...confirmationArgs, correlationId: `${runId}:confirm-a` },
      plannerIdentity
    ),
    captureConvex(
      deploymentName,
      "refereeAssignmentCommands:confirmAssignment",
      { ...confirmationArgs, correlationId: `${runId}:confirm-b` },
      plannerIdentity
    ),
  ]);
  const confirmed = assertSingleSuccessfulConfirmation(confirmationResults);

  const finalQueue = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listPlannerQueue",
    { clubId: fixture.clubId },
    plannerIdentity
  );
  const assignedNeed = finalQueue.find(
    (entry) => entry.needId === fixture.needId
  );
  assert(assignedNeed?.status === "assigned", "Need was not assigned after confirmation");
  assert(
    assignedNeed.assignment?.assignmentId === confirmed.assignmentId,
    "Planner queue does not contain the confirmed assignment"
  );

  const evidence = await verifyAssignedState(
    deploymentName,
    fixture.clubId,
    assignedNeed,
    referee.identity,
    confirmed.assignmentId
  );
  const cancelled = await runConvex(
    deploymentName,
    "refereeAssignmentCommands:cancelAssignment",
    {
      assignmentId: confirmed.assignmentId,
      assignmentVersion: confirmed.assignmentVersion,
      reason: "Synthetic M2 live cancellation",
      reopenNeed: true,
      correlationId: `${runId}:cancel`,
    },
    plannerIdentity
  );
  assert(
    cancelled.assignmentStatus === "cancelled" &&
      cancelled.needStatus === "open",
    "Assignment cancellation did not reopen the need"
  );
  const cancelledAssignments = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listMyAssignments",
    { clubId: fixture.clubId },
    referee.identity
  );
  const cancelledAssignment = cancelledAssignments.find(
    (assignment) => assignment.assignmentId === confirmed.assignmentId
  );
  assert(
    cancelledAssignment?.status === "cancelled",
    "Referee does not see the cancelled assignment state"
  );
  const cancellationAudit = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listNeedAudit",
    { needId: fixture.needId },
    plannerIdentity
  );
  assert(
    cancellationAudit.some(
      (event) => event.eventType === "assignment_cancelled"
    ),
    "Assignment cancellation audit event is missing"
  );

  const reminder = await verifyReminderScenario(deploymentName, runId, [
    referee.profile.profileId,
  ]);
  const expiry = await verifyExpiryScenario(deploymentName, runId, [
    reminder.refereeProfileId,
  ]);
  console.log(
    JSON.stringify(
      {
        deployment: deploymentName,
        needStatus: assignedNeed.status,
        offerStatus: "accepted",
        assignmentStatus: confirmed.assignmentStatus,
        cancellationStatus: cancelled.assignmentStatus,
        reopenedAfterCancellation: cancelled.needStatus,
        confirmations: { succeeded: 1, rejected: 1 },
        assignmentCountForNeed: evidence.matchingAssignments.length,
        auditEvents: cancellationAudit.map((event) => event.eventType),
        reminder,
        expiry,
      },
      null,
      2
    )
  );
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
