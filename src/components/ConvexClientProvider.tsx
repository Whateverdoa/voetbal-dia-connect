"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { ConvexConnectionBanner } from "./ConvexConnectionBanner";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex =
  convexUrl && convexUrl.length > 0
    ? new ConvexReactClient(convexUrl)
    : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <p className="text-center text-red-600 font-medium">
          Convex niet geconfigureerd
        </p>
        <p className="mt-2 text-sm text-gray-600 text-center max-w-sm">
          Stel <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code> in
          (lokaal: .env.local, op Vercel: omgevingsvariabelen).
        </p>
      </div>
    );
  }
  return (
    <ConvexProvider client={convex}>
      <ConvexConnectionBanner />
      {children}
    </ConvexProvider>
  );
}
