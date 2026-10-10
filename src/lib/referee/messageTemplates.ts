/**
 * Dutch copy-paste templates for WhatsApp / e-mail (admin prep — not auto-sent).
 */

export type UnassignedMatchLine = {
  teamName: string;
  opponent: string;
  isHome: boolean;
  scheduledAt?: number;
  publicCode: string;
};

function formatWhen(scheduledAt?: number): string {
  if (!scheduledAt) return "tijdstip n.t.b.";
  return new Date(scheduledAt).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchLine(m: UnassignedMatchLine): string {
  const home = m.isHome ? m.teamName : m.opponent;
  const away = m.isHome ? m.opponent : m.teamName;
  return `• ${formatWhen(m.scheduledAt)} — ${home} vs ${away} (code ${m.publicCode})`;
}

export function buildClaimOpenWhatsApp(args: {
  appUrl: string;
  weekLabel: string;
  unassigned: UnassignedMatchLine[];
}): string {
  const lines = [
    `Hallo! De claimronde voor speelweek ${args.weekLabel} is open.`,
    "",
    "Open de DIA Live app en claim een wedstrijd onder Scheidsrechter → Beschikbaar:",
    args.appUrl.replace(/\/+$/, "") + "/scheidsrechter",
    "",
  ];
  if (args.unassigned.length > 0) {
    lines.push("Nog zonder scheidsrechter:");
    lines.push(...args.unassigned.map(matchLine));
    lines.push("");
  }
  lines.push("Alvast bedankt!");
  return lines.join("\n");
}

export function buildUnassignedListWhatsApp(args: {
  weekLabel: string;
  unassigned: UnassignedMatchLine[];
}): string {
  if (args.unassigned.length === 0) {
    return `Speelweek ${args.weekLabel}: alle wedstrijden hebben een scheidsrechter.`;
  }
  return [
    `Nog open (speelweek ${args.weekLabel}):`,
    "",
    ...args.unassigned.map(matchLine),
    "",
    "Reageer of claim in de app als je kunt fluiten.",
  ].join("\n");
}

export function buildAssignedWhatsApp(args: {
  refereeName: string;
  teamName: string;
  opponent: string;
  isHome: boolean;
  scheduledAt?: number;
  appUrl: string;
}): string {
  const home = args.isHome ? args.teamName : args.opponent;
  const away = args.isHome ? args.opponent : args.teamName;
  return [
    `Hoi ${args.refereeName},`,
    "",
    `Je bent toegewezen als wedstrijdbegeleider:`,
    `${formatWhen(args.scheduledAt)} — ${home} vs ${away}`,
    "",
    `Open de wedstrijd in de app: ${args.appUrl.replace(/\/+$/, "")}/scheidsrechter`,
  ].join("\n");
}

export function buildClaimOpenEmail(args: {
  refereeName: string;
  appUrl: string;
  weekLabel: string;
}): { subject: string; body: string } {
  const app = args.appUrl.replace(/\/+$/, "");
  return {
    subject: `DIA Live — claimronde speelweek ${args.weekLabel} is open`,
    body: [
      `Beste ${args.refereeName},`,
      "",
      `De claimronde voor speelweek ${args.weekLabel} is geopend.`,
      "Log in op DIA Live en kies onder Scheidsrechter → Beschikbaar een wedstrijd die bij jouw kwalificatie past.",
      "",
      `${app}/scheidsrechter`,
      "",
      "Jonge scheidsrechters: open vooral de app; e-mail is alleen een herinnering.",
      "",
      "Groet,",
      "DIA Live",
    ].join("\n"),
  };
}
