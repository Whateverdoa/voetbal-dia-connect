"use client";

interface MatchLoadingScreenProps {
  isReconnecting?: boolean;
}

export function MatchLoadingScreen({ isReconnecting = false }: MatchLoadingScreenProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-dia-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {isReconnecting ? "Verbinding herstellen..." : "Laden..."}
        </p>
        {isReconnecting && (
          <p className="mt-2 text-sm text-gray-500">
            Even geduld, we verbinden opnieuw
          </p>
        )}
      </div>
    </main>
  );
}
