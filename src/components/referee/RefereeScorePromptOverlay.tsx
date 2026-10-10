"use client";

import type { AssistKind } from "@/lib/assistKind";
import { ShirtNumberPrompt } from "./RefereeScorePrompts";

type RefereeScorePromptOverlayProps = {
  pendingTeam: "home" | "away";
  homeName: string;
  awayName: string;
  shirtNumber: string;
  isLoading: boolean;
  onShirtNumberChange: (value: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  goalKind: AssistKind | null;
  onGoalKindChange: (kind: AssistKind | null) => void;
};

export function RefereeScorePromptOverlay({
  pendingTeam,
  homeName,
  awayName,
  shirtNumber,
  isLoading,
  onShirtNumberChange,
  onConfirm,
  onSkip,
  onCancel,
  goalKind,
  onGoalKindChange,
}: RefereeScorePromptOverlayProps) {
  const teamName = pendingTeam === "home" ? homeName : awayName;

  return (
    <>
      <button
        type="button"
        aria-label="Sluit score-invoer"
        className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg px-2 pb-2 md:px-4 md:pb-4">
        <ShirtNumberPrompt
          teamName={teamName}
          shirtNumber={shirtNumber}
          onShirtNumberChange={onShirtNumberChange}
          onConfirm={onConfirm}
          onSkip={onSkip}
          onCancel={onCancel}
          isLoading={isLoading}
          goalKind={goalKind}
          onGoalKindChange={onGoalKindChange}
        />
      </div>
    </>
  );
}
