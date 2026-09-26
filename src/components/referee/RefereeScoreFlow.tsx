"use client";

import { useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { AssistKind } from "@/lib/assistKind";
import { createCorrelationId } from "@/lib/correlationId";
import { ownGoalBeneficiary } from "@/lib/goalEventText";
import { OwnGoalPrompt } from "./OwnGoalPrompt";
import { RefereeScorePanel } from "./RefereeScorePanel";
import { RefereeScorePromptOverlay } from "./RefereeScorePromptOverlay";

type TeamSide = "home" | "away";

type RefereeScoreFlowProps = {
  matchId: Id<"matches">;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  isLoading: boolean;
  scoreError: string | null;
  canRecord: boolean;
  cardControls: ReactNode;
  withLoading: (
    action: () => Promise<unknown>,
    onError: (message: string) => void,
  ) => Promise<void>;
  onScoreError: (message: string) => void;
};

function parseShirt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
    return undefined;
  }
  return parsed;
}

export function RefereeScoreFlow({
  matchId,
  homeName,
  awayName,
  homeScore,
  awayScore,
  isLoading,
  scoreError,
  canRecord,
  cardControls,
  withLoading,
  onScoreError,
}: RefereeScoreFlowProps) {
  const adjustScore = useMutation(api.matchActions.adjustScore);
  const [pendingTeam, setPendingTeam] = useState<TeamSide | null>(null);
  const [ownGoalOpen, setOwnGoalOpen] = useState(false);
  const [ownGoalKicker, setOwnGoalKicker] = useState<TeamSide | null>(null);
  const [shirtNumber, setShirtNumber] = useState("");
  const [goalKind, setGoalKind] = useState<AssistKind | null>(null);

  const resetGoal = () => {
    setPendingTeam(null);
    setShirtNumber("");
    setGoalKind(null);
  };

  const resetOwnGoal = () => {
    setOwnGoalOpen(false);
    setOwnGoalKicker(null);
    setShirtNumber("");
  };

  const handleDecrement = async (team: TeamSide) => {
    await withLoading(
      () =>
        adjustScore({
          matchId,
          team,
          delta: -1,
          correlationId: createCorrelationId("adjust-score"),
        }),
      onScoreError,
    );
  };

  const handleIncrementStart = (team: TeamSide) => {
    setOwnGoalOpen(false);
    setPendingTeam(team);
    setShirtNumber("");
    setGoalKind(null);
  };

  const handleIncrementConfirm = async (skipNumber: boolean) => {
    if (!pendingTeam) return;
    const scorerNumber = skipNumber ? undefined : parseShirt(shirtNumber);
    await withLoading(
      () =>
        adjustScore({
          matchId,
          team: pendingTeam,
          delta: 1,
          scorerNumber,
          assistKind: goalKind ?? undefined,
          correlationId: createCorrelationId("adjust-score"),
        }),
      onScoreError,
    );
    resetGoal();
  };

  const handleOwnGoalStart = () => {
    setPendingTeam(null);
    setOwnGoalOpen(true);
    setOwnGoalKicker(null);
    setShirtNumber("");
  };

  const handleOwnGoalConfirm = async () => {
    if (!ownGoalKicker) return;
    await withLoading(
      () =>
        adjustScore({
          matchId,
          team: ownGoalBeneficiary(ownGoalKicker),
          delta: 1,
          isOwnGoal: true,
          scorerNumber: parseShirt(shirtNumber),
          correlationId: createCorrelationId("own-goal"),
        }),
      onScoreError,
    );
    resetOwnGoal();
  };

  return (
    <>
      <RefereeScorePanel
        homeName={homeName}
        awayName={awayName}
        homeScore={homeScore}
        awayScore={awayScore}
        isLoading={isLoading || !canRecord}
        scoreError={scoreError}
        onIncrement={handleIncrementStart}
        onDecrement={handleDecrement}
        cardControls={cardControls}
        extraControls={
          canRecord ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleOwnGoalStart}
              className="w-full min-h-[52px] rounded-xl border-2 border-gray-300 bg-white text-base font-bold text-gray-800 active:scale-[0.98] disabled:opacity-50"
            >
              Eigen doelpunt
            </button>
          ) : null
        }
      />

      {pendingTeam ? (
        <RefereeScorePromptOverlay
          pendingTeam={pendingTeam}
          homeName={homeName}
          awayName={awayName}
          shirtNumber={shirtNumber}
          isLoading={isLoading}
          onShirtNumberChange={setShirtNumber}
          onConfirm={() => void handleIncrementConfirm(false)}
          onSkip={() => void handleIncrementConfirm(true)}
          onCancel={resetGoal}
          goalKind={goalKind}
          onGoalKindChange={setGoalKind}
        />
      ) : null}

      {ownGoalOpen ? (
        <>
          <button
            type="button"
            aria-label="Sluit eigen-doelpunt"
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={resetOwnGoal}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg px-2 pb-2 md:px-4 md:pb-4">
            <OwnGoalPrompt
              homeName={homeName}
              awayName={awayName}
              kicker={ownGoalKicker}
              shirtNumber={shirtNumber}
              isLoading={isLoading}
              onKicker={setOwnGoalKicker}
              onShirtNumberChange={setShirtNumber}
              onConfirm={() => void handleOwnGoalConfirm()}
              onCancel={resetOwnGoal}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
