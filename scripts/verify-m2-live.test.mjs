import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRequiredAuditEvents,
  assertSingleSuccessfulConfirmation,
  requireCloudDevDeployment,
} from "./verify-m2-live.mjs";

test("accepts only an explicit cloud development deployment", () => {
  assert.equal(requireCloudDevDeployment("dev:brainy-buffalo-707"), "brainy-buffalo-707");
  assert.throws(() => requireCloudDevDeployment("prod:example"));
  assert.throws(() => requireCloudDevDeployment("local:example"));
  assert.throws(() => requireCloudDevDeployment(undefined));
});

test("requires one winner from concurrent confirmation attempts", () => {
  assert.deepEqual(
    assertSingleSuccessfulConfirmation([
      { ok: true, value: { assignmentId: "assignment-1" } },
      { ok: false, error: "VERSION_CONFLICT" },
    ]),
    { assignmentId: "assignment-1" }
  );
  assert.throws(() =>
    assertSingleSuccessfulConfirmation([
      { ok: true, value: {} },
      { ok: true, value: {} },
    ])
  );
  assert.throws(() =>
    assertSingleSuccessfulConfirmation([
      { ok: false, error: "first" },
      { ok: false, error: "second" },
    ])
  );
});

test("requires the complete manual-assignment audit trail", () => {
  assert.doesNotThrow(() =>
    assertRequiredAuditEvents([
      { eventType: "offer_sent" },
      { eventType: "offer_accepted" },
      { eventType: "assignment_confirmed" },
    ])
  );
  assert.throws(() =>
    assertRequiredAuditEvents([
      { eventType: "offer_sent" },
      { eventType: "offer_accepted" },
    ])
  );
});
