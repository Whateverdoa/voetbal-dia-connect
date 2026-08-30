import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONVEX_BIN = path.join(PROJECT_ROOT, "node_modules", ".bin", "convex");
const SEED_OPPONENT = "Testclub United JO12-1";
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

async function findEligibleReferee(deploymentName, clubId, needId) {
  for (const refereeNumber of [3, 4, 1, 2]) {
    const identity = seedIdentity(`referee-${refereeNumber}`);
    const profile = await runConvex(
      deploymentName,
      "refereeDomain:getMyRefereeProfile",
      { clubId },
      identity
    );
    if (!profile) continue;
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

  const club = await runConvex(
    deploymentName,
    "admin:getClubBySlug",
    { slug: "dia" }
  );
  assert(club?._id, "Synthetic DIA club is missing; run npm run seed:new-app first");

  const plannerIdentity = seedIdentity("planner");
  const queue = await runConvex(
    deploymentName,
    "refereeAssignmentQueries:listPlannerQueue",
    { clubId: club._id },
    plannerIdentity
  );
  const need = queue.find((entry) => entry.match.opponent === SEED_OPPONENT);
  assert(need, "Synthetic M2 referee need is missing; run npm run seed:new-app first");
  assert(
    need.status === "open",
    `Synthetic M2 referee need must be open for a fresh verification; received ${need.status}`
  );

  const referee = await findEligibleReferee(
    deploymentName,
    club._id,
    need.needId
  );
  const runId = `m2-live-${Date.now()}`;
  const offer = await runConvex(
    deploymentName,
    "refereeAssignmentCommands:sendOffer",
    {
      needId: need.needId,
      refereeProfileId: referee.profile.profileId,
      expiresAt: Date.now() + 30 * 60 * 1000,
      needVersion: need.version,
      correlationId: `${runId}:offer`,
    },
    plannerIdentity
  );
  assert(offer.offerStatus === "pending", "Offer was not created as pending");

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
    { clubId: club._id },
    referee.identity
  );
  assert(
    !beforeConfirmation.some((assignment) => assignment.needId === need.needId),
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
    { clubId: club._id },
    plannerIdentity
  );
  const assignedNeed = finalQueue.find((entry) => entry.needId === need.needId);
  assert(assignedNeed?.status === "assigned", "Need was not assigned after confirmation");
  assert(
    assignedNeed.assignment?.assignmentId === confirmed.assignmentId,
    "Planner queue does not contain the confirmed assignment"
  );

  const evidence = await verifyAssignedState(
    deploymentName,
    club._id,
    assignedNeed,
    referee.identity,
    confirmed.assignmentId
  );
  console.log(
    JSON.stringify(
      {
        deployment: deploymentName,
        needStatus: assignedNeed.status,
        offerStatus: "accepted",
        assignmentStatus: confirmed.assignmentStatus,
        confirmations: { succeeded: 1, rejected: 1 },
        assignmentCountForNeed: evidence.matchingAssignments.length,
        auditEvents: evidence.audit.map((event) => event.eventType),
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
