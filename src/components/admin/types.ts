import { Id } from "@/convex/_generated/dataModel";
import type { QualificationState } from "@/lib/admin/assignmentBoard";

export interface AssignmentBoardMatch {
  _id: Id<"matches">;
  clubId: string;
  clubName: string;
  teamId: Id<"teams">;
  publicCode: string;
  opponent: string;
  isHome: boolean;
  scheduledAt?: number;
  status: "scheduled" | "lineup" | "live" | "halftime" | "finished";
  currentQuarter: number;
  quarterCount: number;
  homeScore: number;
  awayScore: number;
  refereeId?: Id<"referees">;
  teamName: string;
  coachName: string | null;
  refereeName: string | null;
  dateKey: string;
  dateLabel: string;
  matchQualificationTags: string[];
  refereeQualificationTags: string[];
  qualificationState: QualificationState;
  teamLogoUrl?: string | null;
  clubLogoUrl?: string | null;
  opponentLogoUrl?: string | null;
}

export interface ActiveRefereeOption {
  id: Id<"referees">;
  name: string;
  qualificationTags: string[];
}
