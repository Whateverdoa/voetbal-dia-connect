export function MatchDetailsForm({
  opponent,
  setOpponent,
  isHome,
  setIsHome,
  quarterCount,
  setQuarterCount,
}: {
  opponent: string;
  setOpponent: (value: string) => void;
  isHome: boolean;
  setIsHome: (value: boolean) => void;
  quarterCount: number;
  setQuarterCount: (value: number) => void;
}) {
  return (
    <section className="bg-white rounded-xl shadow p-5">
      <h2 className="font-semibold text-lg mb-4">Wedstrijd details</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tegenstander
          </label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="bijv. FC Groene Ster"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-dia-green focus:outline-none text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Locatie
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsHome(true)}
              className={`py-4 px-4 rounded-xl border-2 transition-all font-semibold min-h-[56px] ${
                isHome
                  ? "border-dia-green bg-green-50 text-dia-green"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              🏠 Thuis
            </button>
            <button
              onClick={() => setIsHome(false)}
              className={`py-4 px-4 rounded-xl border-2 transition-all font-semibold min-h-[56px] ${
                !isHome
                  ? "border-dia-green bg-green-50 text-dia-green"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              🚌 Uit
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speelwijze
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setQuarterCount(4)}
              className={`py-4 px-4 rounded-xl border-2 transition-all font-semibold min-h-[56px] ${
                quarterCount === 4
                  ? "border-dia-green bg-green-50 text-dia-green"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              4 kwarten
            </button>
            <button
              onClick={() => setQuarterCount(2)}
              className={`py-4 px-4 rounded-xl border-2 transition-all font-semibold min-h-[56px] ${
                quarterCount === 2
                  ? "border-dia-green bg-green-50 text-dia-green"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              2 helften
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CreateMatchFooter({
  opponent,
  selectedCount,
  isCreating,
  error,
  onCreate,
}: {
  opponent: string;
  selectedCount: number;
  isCreating: boolean;
  error: string | null;
  onCreate: () => void;
}) {
  const canCreate = opponent.trim() && selectedCount > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <button
          onClick={onCreate}
          disabled={!canCreate || isCreating}
          className="w-full py-4 bg-dia-green text-white font-semibold rounded-xl hover:bg-dia-green-light disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[56px] text-lg active:scale-[0.98]"
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Aanmaken...
            </span>
          ) : (
            "Wedstrijd aanmaken"
          )}
        </button>

        {!canCreate && !error && (
          <p className="text-center text-sm text-gray-500 mt-2">
            {!opponent.trim() && selectedCount === 0
              ? "Vul tegenstander in en selecteer spelers"
              : !opponent.trim()
                ? "Vul de tegenstander in"
                : "Selecteer minimaal 1 speler"}
          </p>
        )}
      </div>
    </div>
  );
}
