import type { MatchStatus } from "@/components/match/types";

export function refereeStatusLabel(args: {
  status: MatchStatus;
  isLive: boolean;
  hasInterruption: boolean;
  currentQuarter: number;
  quarterCount: number;
}): string {
  if (args.status === "halftime") return "Rust";
  if (args.status === "finished") return "Afgelopen";
  if (args.hasInterruption) {
    return `${args.quarterCount === 2 ? "Helft" : "Kwart"} ${args.currentQuarter} - onderbreking`;
  }
  if (args.isLive) {
    return args.quarterCount === 2
      ? `Helft ${args.currentQuarter}`
      : `Kwart ${args.currentQuarter}`;
  }
  return "Nog niet begonnen";
}

export function refereeSurfaceClasses(args: {
  isLive: boolean;
  isHalftime: boolean;
  isFinished: boolean;
  hasInterruption: boolean;
}): string {
  if (args.hasInterruption || args.isHalftime) {
    return "from-orange-500 to-orange-600";
  }
  if (args.isLive) return "from-dia-black to-neutral-900";
  if (args.isFinished) return "from-red-600 to-red-700";
  return "from-blue-600 to-blue-700";
}
