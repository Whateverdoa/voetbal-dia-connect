"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { MatchStatus } from "@/components/match/types";
import { BreakClock } from "@/components/match/BreakClock";
import { QuarterEndReminderBanner } from "@/components/match/QuarterEndReminderBanner";
import { StoppageControls } from "@/components/match/StoppageControls";
import { ConfirmPeriodEnd } from "@/components/match/ConfirmPeriodEnd";

type RefereeClockPanelProps = {
  matchId: Id<"matches">;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  pausedAt?: number;
  activeStoppageStartedAt?: number;
  stoppageAdvisoryMs?: number;
  quarterReminderMessage?: string | null;
  onDismissQuarterReminder?: () => void;
  useBreakClock?: boolean;
  breakClockAutoStart?: boolean;
  scheduledBreakEndAt?: number;
  isLoading: boolean;
  clockError: string | null;
  endPeriodConfirm: boolean;
  onSetEndPeriodConfirm: (confirming: boolean) => void;
  onStartMatch: () => Promise<unknown>;
  onNextQuarter: () => Promise<unknown>;
  onResumeHalftime: () => Promise<unknown>;
  onClockAction: (
    action: () => Promise<unknown>,
    onError: (message: string) => void
  ) => void;
  onClockError: (message: string) => void;
};

export function RefereeClockPanel({
  matchId,
  status,
  currentQuarter,
  quarterCount,
  pausedAt,
  activeStoppageStartedAt,
  stoppageAdvisoryMs,
  quarterReminderMessage,
  onDismissQuarterReminder,
  useBreakClock = true,
  breakClockAutoStart = true,
  scheduledBreakEndAt,
  isLoading,
  clockError,
  endPeriodConfirm,
  onSetEndPeriodConfirm,
  onStartMatch,
  onNextQuarter,
  onResumeHalftime,
  onClockAction,
  onClockError,
}: RefereeClockPanelProps) {
  const isFinalSegment = currentQuarter >= quarterCount;
  const isLive = status === "live";
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";
  const isScheduled = status === "scheduled" || status === "lineup";
  const quarterLabel = quarterCount === 2 ? "helft" : "kwart";

  return (
    <div className="space-y-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
        Klokbediening
      </h2>

      {clockError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {clockError}
        </div>
      )}

      {isLive && quarterReminderMessage && (
        <QuarterEndReminderBanner
          message={quarterReminderMessage}
          onDismiss={onDismissQuarterReminder}
        />
      )}

      {isScheduled && (
        <button
          onClick={() => onClockAction(onStartMatch, onClockError)}
          disabled={isLoading}
          className="w-full min-h-[52px] rounded-xl bg-dia-green py-3.5 text-base font-bold text-white shadow-lg transition-transform hover:bg-dia-green-dark disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-5 sm:text-xl"
        >
          {isLoading ? "Bezig..." : "Start wedstrijd"}
        </button>
      )}

      {isLive &&
        (endPeriodConfirm ? (
          <ConfirmPeriodEnd
            key={`${matchId}:${currentQuarter}:${quarterCount}`}
            isFinalSegment={isFinalSegment}
            periodLabel={quarterLabel}
            currentQuarter={currentQuarter}
            isLoading={isLoading}
            onCancel={() => onSetEndPeriodConfirm(false)}
            onConfirm={() => {
              onSetEndPeriodConfirm(false);
              onClockAction(onNextQuarter, onClockError);
            }}
          />
        ) : (
          <div className="space-y-2">
            <StoppageControls
              matchId={matchId}
              activeStoppageStartedAt={activeStoppageStartedAt ?? pausedAt}
              stoppageAdvisoryMs={stoppageAdvisoryMs}
              isLoading={isLoading}
              onAction={(action) => onClockAction(action, onClockError)}
            />
            <button
              type="button"
              onClick={() => onSetEndPeriodConfirm(true)}
              disabled={isLoading}
              className="min-h-[52px] w-full rounded-xl border-2 border-gray-300 px-2 py-2.5 text-sm font-semibold text-gray-700 transition-transform hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-4 sm:text-base"
            >
              {isLoading
                ? "Bezig..."
                : isFinalSegment
                  ? "Einde match"
                  : `Einde ${quarterLabel} ${currentQuarter}`}
            </button>
          </div>
        ))}

      {isHalftime && (
        <div className="space-y-3">
          {useBreakClock !== false && (
            <BreakClock
              scheduledBreakEndAt={scheduledBreakEndAt}
              autoStart={breakClockAutoStart !== false}
            />
          )}
          <button
            onClick={() => onClockAction(onResumeHalftime, onClockError)}
            disabled={isLoading}
            className="w-full min-h-[52px] rounded-xl bg-dia-green py-3.5 text-base font-bold text-white shadow-lg transition-transform hover:bg-dia-green-dark disabled:opacity-50 active:scale-[0.98] sm:min-h-[64px] sm:py-5 sm:text-xl"
          >
            {isLoading ? "Bezig..." : `Start ${quarterLabel} ${currentQuarter}`}
          </button>
        </div>
      )}

      {isFinished && (
        <div className="py-4 text-center">
          <p className="font-medium text-gray-500">Wedstrijd is afgelopen</p>
        </div>
      )}
    </div>
  );
}
