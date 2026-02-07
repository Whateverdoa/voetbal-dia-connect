"use client";

interface CoachSession {
  coachId: string;
  coachName: string;
  pin: string;
  teams: { id: string; name: string }[];
}

interface ResumeSessionPromptProps {
  session: CoachSession;
  onResume: () => void;
  onNewLogin: () => void;
}

export function ResumeSessionPrompt({
  session,
  onResume,
  onNewLogin,
}: ResumeSessionPromptProps) {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-dia-green text-white p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold">DIA Live</h1>
          <p className="text-sm text-white/80">Coach inloggen</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 bg-dia-green/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">👋</span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Welkom terug, {session.coachName}!
            </h2>
            <p className="text-gray-600 mt-1">
              {session.teams.map((t) => t.name).join(", ")}
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={onResume}
              className="w-full py-4 rounded-xl bg-dia-green text-white text-lg font-semibold
                active:scale-[0.98] transition-all shadow-md"
            >
              Doorgaan
            </button>
            <button
              onClick={onNewLogin}
              className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium
                active:scale-[0.98] transition-all"
            >
              Andere coach inloggen
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export type { CoachSession };
