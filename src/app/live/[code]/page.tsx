"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LiveMatch } from "@/components/live";
import type { MatchData } from "@/components/live";

export default function LiveMatchPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const match = useQuery(api.matches.getByPublicCode, { code });

  // Track connection state (Convex query returns undefined while loading/disconnected)
  const [isConnected, setIsConnected] = useState(true);
  const lastDataRef = useRef<MatchData | null>(null);

  useEffect(() => {
    if (match === undefined && lastDataRef.current !== null) {
      // Had data before, now undefined = likely disconnected
      setIsConnected(false);
    } else if (match !== undefined) {
      setIsConnected(true);
      if (match !== null) {
        lastDataRef.current = match;
      }
    }
  }, [match]);

  if (match === undefined) {
    return <LoadingScreen />;
  }

  if (match === null) {
    return <NotFoundScreen code={code} />;
  }

  return <LiveMatch match={match} code={code} isConnected={isConnected} />;
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dia-green to-green-800">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4">Wedstrijd laden...</p>
      </div>
    </main>
  );
}

function NotFoundScreen({ code }: { code: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2">Wedstrijd niet gevonden</h1>
        <p className="text-gray-500 mb-6">
          Code <span className="font-mono font-bold">{code}</span> bestaat niet
          of is verlopen.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-dia-green text-white rounded-lg font-medium"
        >
          Andere code invoeren
        </Link>
      </div>
    </main>
  );
}
