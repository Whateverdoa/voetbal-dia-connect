"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  buildClaimOpenWhatsApp,
  buildUnassignedListWhatsApp,
} from "@/lib/referee/messageTemplates";
import { getPlayWeekBounds } from "@/lib/referee/playWeek";

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ClaimWindowStrip({
  onStatusMessage,
}: {
  onStatusMessage: (message: string) => void;
}) {
  const { weekStartMs } = getPlayWeekBounds();
  const windowDoc = useQuery(api.admin.getClaimWindowForWeek, { weekStartMs });
  const stats = useQuery(api.admin.getWeekAssignmentStats, { weekStartMs });
  const unassigned = useQuery(api.admin.listUnassignedForWeek, { weekStartMs });
  const openWindow = useMutation(api.admin.openClaimWindow);
  const closeWindow = useMutation(api.admin.closeClaimWindow);
  const sendNudge = useMutation(api.admin.sendEmailNudgeNow);
  const [busy, setBusy] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "https://dia-live.app";

  async function handleOpen() {
    setBusy(true);
    try {
      await openWindow({ weekStartMs, sendEmailNudge: sendEmail });
      onStatusMessage(
        sendEmail
          ? "Claimronde geopend (e-mail nudge gepland indien geconfigureerd)."
          : "Claimronde geopend."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      onStatusMessage(`Fout: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    try {
      await closeWindow({ weekStartMs });
      onStatusMessage("Claimronde gesloten.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      onStatusMessage(`Fout: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleNudgeNow() {
    setBusy(true);
    try {
      await sendNudge({ weekStartMs });
      onStatusMessage("E-mail nudge gepland (alleen als RESEND_API_KEY gezet is).");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      onStatusMessage(`Fout: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyInvite() {
    if (!stats || !unassigned) return;
    const text = buildClaimOpenWhatsApp({
      appUrl,
      weekLabel: stats.weekLabel,
      unassigned: unassigned.map((m) => ({
        teamName: m.teamName,
        opponent: m.opponent,
        isHome: m.isHome,
        scheduledAt: m.scheduledAt,
        publicCode: m.publicCode,
      })),
    });
    await copyText(text);
    onStatusMessage("WhatsApp-tekst gekopieerd.");
  }

  async function handleCopyOpenList() {
    if (!stats || !unassigned) return;
    const text = buildUnassignedListWhatsApp({
      weekLabel: stats.weekLabel,
      unassigned: unassigned.map((m) => ({
        teamName: m.teamName,
        opponent: m.opponent,
        isHome: m.isHome,
        scheduledAt: m.scheduledAt,
        publicCode: m.publicCode,
      })),
    });
    await copyText(text);
    onStatusMessage("Openstaande wedstrijden gekopieerd.");
  }

  const isOpen = windowDoc?.isEffectivelyOpen === true;
  const statusLabel = !windowDoc
    ? "Nog niet gestart"
    : isOpen
      ? "Open"
      : windowDoc.status === "closed"
        ? "Gesloten"
        : "Gesloten / verlopen";

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dia-black">
            Claimronde
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Speelweek {stats?.weekLabel ?? "…"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Status: <span className="font-semibold text-slate-900">{statusLabel}</span>
            {isOpen && windowDoc && (
              <>
                {" "}
                · sluit{" "}
                {new Date(windowDoc.closesAt).toLocaleString("nl-NL", {
                  timeZone: "Europe/Amsterdam",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </p>
          {stats && (
            <p className="mt-2 text-sm text-slate-500">
              {stats.claimed}/{stats.total} toegewezen ·{" "}
              <span className={stats.unassigned > 0 ? "font-semibold text-amber-700" : ""}>
                {stats.unassigned} open
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Stuur e-mail nudge bij openen
          </label>
          <div className="flex flex-wrap gap-2">
            {!isOpen ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleOpen()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dia-green px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                Open claimronde
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleClose()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                Sluit claimronde
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCopyInvite()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Kopieer WhatsApp-uitnodiging
            </button>
            <button
              type="button"
              onClick={() => void handleCopyOpenList()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
            >
              Kopieer open lijst
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleNudgeNow()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              E-mail nudge nu
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
