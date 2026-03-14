"use client";

import { useEffect, useState } from "react";

function playPauseReminderTone() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.07;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // Ignore unsupported audio devices.
  }
}

export function usePauseReminder(
  isPaused: boolean,
  pausedAt: number | undefined,
  pauseReminderMinutes: number
) {
  const [pauseReminderActive, setPauseReminderActive] = useState(false);
  const [pauseReminderTriggered, setPauseReminderTriggered] = useState(false);

  useEffect(() => {
    if (!isPaused || pausedAt == null) {
      setPauseReminderActive(false);
      setPauseReminderTriggered(false);
      return;
    }
    if (pauseReminderTriggered) return;

    const elapsedPausedMs = Date.now() - pausedAt;
    const thresholdMs = pauseReminderMinutes * 60 * 1000;
    const remainingMs = Math.max(0, thresholdMs - elapsedPausedMs);

    const timer = window.setTimeout(() => {
      setPauseReminderActive(true);
      setPauseReminderTriggered(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([120, 80, 120]);
      }
      playPauseReminderTone();
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [isPaused, pausedAt, pauseReminderMinutes, pauseReminderTriggered]);

  return pauseReminderActive;
}
