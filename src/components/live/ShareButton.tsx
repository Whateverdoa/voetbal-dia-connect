"use client";

import { useState, useCallback } from "react";
import { Share2, Check, Copy } from "lucide-react";
import clsx from "clsx";

interface ShareButtonProps {
  code: string;
  teamName: string;
  opponent: string;
  className?: string;
}

export function ShareButton({
  code,
  teamName,
  opponent,
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareData = {
    title: `${teamName} vs ${opponent} - DIA Live`,
    text: `Volg de wedstrijd ${teamName} vs ${opponent} live! Code: ${code}`,
    url: typeof window !== "undefined" ? window.location.href : "",
  };

  const handleShare = useCallback(async () => {
    // Try Web Share API first
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or error - fall through to clipboard
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareData.url || code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Final fallback - copy code only
      const textArea = document.createElement("textarea");
      textArea.value = shareData.url || code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code, shareData]);

  return (
    <button
      onClick={handleShare}
      className={clsx(
        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
        "bg-white/20 hover:bg-white/30 active:scale-95",
        "text-white text-sm",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Gekopieerd!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Deel</span>
        </>
      )}
    </button>
  );
}
