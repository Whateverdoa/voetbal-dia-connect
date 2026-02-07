"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";

const STORAGE_KEY = "dia-live-sound-enabled";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setEnabled(stored === "true");
    }
  }, []);

  const toggle = useCallback(() => {
    const newValue = !enabled;
    setEnabled(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  }, [enabled]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
          "bg-gray-100 text-gray-400",
          className
        )}
        disabled
      >
        <VolumeX className="w-4 h-4" />
        <span>Geluid</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
        enabled
          ? "bg-dia-green/10 text-dia-green"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
        className
      )}
      aria-label={enabled ? "Geluid uitschakelen" : "Geluid inschakelen"}
    >
      {enabled ? (
        <>
          <Volume2 className="w-4 h-4" />
          <span>Geluid aan</span>
        </>
      ) : (
        <>
          <VolumeX className="w-4 h-4" />
          <span>Geluid uit</span>
        </>
      )}
    </button>
  );
}

// Hook to use sound/vibration on goals
export function useGoalNotification() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setEnabled(stored === "true");

    // Listen for storage changes (in case toggle is used elsewhere)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setEnabled(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const notify = useCallback(() => {
    if (!enabled) return;

    // Vibration (if supported)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Sound (simple beep using Web Audio API)
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // Audio not supported, silently fail
    }
  }, [enabled]);

  return { notify, enabled };
}
