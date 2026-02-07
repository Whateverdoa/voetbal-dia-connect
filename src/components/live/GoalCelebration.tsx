"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface GoalCelebrationProps {
  show: boolean;
  isOurGoal: boolean;
  onComplete: () => void;
}

export function GoalCelebration({
  show,
  isOurGoal,
  onComplete,
}: GoalCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={clsx(
          "text-center animate-bounce",
          isOurGoal ? "text-green-500" : "text-gray-500"
        )}
      >
        <div
          className={clsx(
            "text-6xl md:text-8xl font-black tracking-wider",
            "animate-pulse drop-shadow-lg",
            isOurGoal ? "text-green-500" : "text-red-500"
          )}
        >
          {isOurGoal ? "GOAL!" : "TEGEN"}
        </div>
        <div className="text-4xl mt-2">⚽</div>
      </div>
      {/* Confetti-like background effect for our goals */}
      {isOurGoal && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-ping"
              style={{
                backgroundColor: i % 2 === 0 ? "#22c55e" : "#fbbf24",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScoreWithAnimationProps {
  homeScore: number;
  awayScore: number;
  previousHomeScore?: number;
  previousAwayScore?: number;
  className?: string;
}

export function ScoreWithAnimation({
  homeScore,
  awayScore,
  previousHomeScore,
  previousAwayScore,
  className,
}: ScoreWithAnimationProps) {
  const [homeHighlight, setHomeHighlight] = useState(false);
  const [awayHighlight, setAwayHighlight] = useState(false);

  useEffect(() => {
    if (previousHomeScore !== undefined && homeScore > previousHomeScore) {
      setHomeHighlight(true);
      const timer = setTimeout(() => setHomeHighlight(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [homeScore, previousHomeScore]);

  useEffect(() => {
    if (previousAwayScore !== undefined && awayScore > previousAwayScore) {
      setAwayHighlight(true);
      const timer = setTimeout(() => setAwayHighlight(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [awayScore, previousAwayScore]);

  return (
    <div className={clsx("text-5xl md:text-6xl font-bold tracking-tight", className)}>
      <span
        className={clsx(
          "transition-all duration-300",
          homeHighlight && "scale-125 text-yellow-300"
        )}
      >
        {homeScore}
      </span>
      <span className="mx-2 opacity-50">-</span>
      <span
        className={clsx(
          "transition-all duration-300",
          awayHighlight && "scale-125 text-yellow-300"
        )}
      >
        {awayScore}
      </span>
    </div>
  );
}
