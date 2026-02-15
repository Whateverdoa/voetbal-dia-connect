"use client";

import { useConvexConnectionState } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Shows a dismissible banner when Convex WebSocket/HTTP connection fails,
 * with the same troubleshooting steps Convex suggests.
 */
export function ConvexConnectionBanner() {
  const connection = useConvexConnectionState();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const hasProblem =
    !connection.isWebSocketConnected &&
    (connection.connectionRetries > 2 || !connection.hasEverConnected);

  useEffect(() => {
    if (hasProblem && !dismissed) {
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
    if (!hasProblem) {
      setShow(false);
      setDismissed(false);
    }
  }, [hasProblem, dismissed]);

  if (!show || dismissed) return null;

  return (
    <div
      role="alert"
      className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800"
    >
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="font-medium">Geen verbinding met de server</p>
          <p className="mt-1 text-amber-700">
            Probeer: ander netwerk (bv. mobiele data), pagina herladen, VPN uit,
            of andere browser/incognito.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 font-medium transition-colors"
          >
            Herladen
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
            aria-label="Sluiten"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
