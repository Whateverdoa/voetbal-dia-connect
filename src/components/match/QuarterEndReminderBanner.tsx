"use client";

type QuarterEndReminderBannerProps = {
  message: string;
  onDismiss?: () => void;
};

export function QuarterEndReminderBanner({
  message,
  onDismiss,
}: QuarterEndReminderBannerProps) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-2.5 text-center shadow-sm"
    >
      <p className="text-sm font-semibold leading-snug text-amber-950">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 text-xs font-medium text-amber-800 underline underline-offset-2"
        >
          Melding weg
        </button>
      )}
    </div>
  );
}
