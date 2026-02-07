"use client";

interface PinDisplayProps {
  pin: string;
  maxLength: number;
  showError: boolean;
}

export function PinDisplay({ pin, maxLength, showError }: PinDisplayProps) {
  return (
    <div
      className={`flex justify-center gap-3 transition-transform ${
        showError ? "animate-shake" : ""
      }`}
    >
      {Array.from({ length: maxLength }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full transition-all duration-150 ${
            i < pin.length
              ? showError
                ? "bg-red-500 scale-110"
                : "bg-dia-green scale-110"
              : "bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
