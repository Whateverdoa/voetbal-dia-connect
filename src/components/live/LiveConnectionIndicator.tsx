"use client";

import { Wifi, WifiOff } from "lucide-react";
import clsx from "clsx";

interface LiveConnectionIndicatorProps {
  isConnected: boolean;
  className?: string;
}

export function LiveConnectionIndicator({
  isConnected,
  className,
}: LiveConnectionIndicatorProps) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-colors",
        isConnected
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700",
        className
      )}
    >
      <span
        className={clsx(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
        )}
      />
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Live verbinding actief</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Verbinding verbroken</span>
        </>
      )}
    </div>
  );
}
