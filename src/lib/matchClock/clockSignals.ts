/** Shared haptic/audio cues for match clock reminders (referee UI). */

export function playClockReminderTone(pitchHz = 880, durationSec = 0.2): void {
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
    oscillator.frequency.value = pitchHz;
    gainNode.gain.value = 0.08;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationSec);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // Unsupported audio on this device.
  }
}

export function vibrateClockReminder(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

export function signalQuarterNominalEnd(): void {
  vibrateClockReminder([200, 100, 200, 100, 200]);
  playClockReminderTone(880, 0.25);
  window.setTimeout(() => playClockReminderTone(660, 0.18), 280);
}

export function signalQuarterExtraMinute(): void {
  vibrateClockReminder([120, 80, 120]);
  playClockReminderTone(740, 0.2);
}
