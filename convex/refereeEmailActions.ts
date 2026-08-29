"use node";

/**
 * Optional Resend e-mail nudges for claim windows.
 * No-ops cleanly when RESEND_API_KEY is unset.
 */
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { buildClaimOpenEmail } from "../src/lib/referee/messageTemplates";
import { formatPlayWeekLabel } from "./lib/playWeek";

type RefereeEmailRow = {
  name: string;
  email?: string;
  contactEmail?: string;
};

async function sendResendEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY ontbreekt — e-mail nudge overgeslagen");
    return false;
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "DIA Live <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      text: args.body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Resend fout:", response.status, text);
    return false;
  }
  return true;
}

export const sendClaimOpenNudges = internalAction({
  args: { weekStartMs: v.number() },
  returns: v.object({
    attempted: v.number(),
    sent: v.number(),
    skipped: v.number(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ attempted: number; sent: number; skipped: number }> => {
    const referees: RefereeEmailRow[] = await ctx.runQuery(
      internal.refereeEmailQueries.listActiveRefereeEmails,
      {}
    );

    const weekLabel = formatPlayWeekLabel(args.weekStartMs);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.SITE_URL ??
      "https://dia-live.app";

    let sent = 0;
    let skipped = 0;
    for (const referee of referees) {
      const to = referee.contactEmail || referee.email;
      if (!to) {
        skipped += 1;
        continue;
      }
      const template = buildClaimOpenEmail({
        refereeName: referee.name,
        appUrl,
        weekLabel,
      });
      const ok = await sendResendEmail({
        to,
        subject: template.subject,
        body: template.body,
      });
      if (ok) sent += 1;
      else skipped += 1;
    }

    return { attempted: referees.length, sent, skipped };
  },
});
