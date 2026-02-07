"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Share2, ArrowRight } from "lucide-react";

interface MatchCreatedSuccessProps {
  publicCode: string;
  matchId: string;
  opponent: string;
  pin: string;
}

export function MatchCreatedSuccess({
  publicCode,
  matchId,
  opponent,
  pin,
}: MatchCreatedSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = publicCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareText = `Volg de wedstrijd tegen ${opponent} live! Code: ${publicCode}`;
    const shareUrl = `${window.location.origin}/live/${publicCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "DIA Live - Wedstrijd volgen",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
        handleCopy();
      }
    } else {
      // Fallback: copy the share text
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        handleCopy();
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-dia-green text-white p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Wedstrijd aangemaakt!</h1>
          <p className="text-sm opacity-75">vs {opponent}</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Success message */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-green-800 mb-2">
            Wedstrijd is klaar!
          </h2>
          <p className="text-green-700">
            Deel de code met ouders zodat ze live kunnen meekijken.
          </p>
        </div>

        {/* Public code display */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-sm text-gray-600 text-center mb-3">
            Deel deze code met ouders:
          </p>

          {/* Large code display */}
          <div className="bg-gray-100 rounded-xl p-6 mb-4">
            <p className="text-4xl sm:text-5xl font-mono font-bold text-center tracking-[0.3em] text-gray-900">
              {publicCode}
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors min-h-[56px]"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-600">Gekopieerd!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Kopieer code</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-4 px-4 bg-dia-green hover:bg-dia-green-light text-white font-semibold rounded-xl transition-colors min-h-[56px]"
            >
              <Share2 className="w-5 h-5" />
              <span>Delen</span>
            </button>
          </div>
        </section>

        {/* Instructions */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Hoe werkt het?</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Ouders gaan naar de DIA Live website</li>
            <li>
              Ze voeren de code{" "}
              <span className="font-mono font-bold">{publicCode}</span> in
            </li>
            <li>Ze kunnen de wedstrijd live volgen!</li>
          </ol>
        </section>

        {/* Navigation buttons */}
        <div className="space-y-3 pt-4">
          <Link
            href={`/coach/match/${matchId}?pin=${pin}`}
            className="flex items-center justify-center gap-2 w-full py-4 bg-dia-green text-white font-semibold rounded-xl hover:bg-dia-green-light transition-colors min-h-[56px]"
          >
            <span>Naar wedstrijd</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href={`/coach?pin=${pin}`}
            className="flex items-center justify-center gap-2 w-full py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors min-h-[56px]"
          >
            Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
