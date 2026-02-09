"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length >= 4) {
      router.push(`/live/${code.toUpperCase()}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-dia-green">DIA Live</h1>
          <p className="mt-2 text-gray-600">Volg de wedstrijd live</p>
        </div>

        {/* Public: Enter match code */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="code" className="sr-only">
              Wedstrijd code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Voer wedstrijd code in"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest uppercase border-2 border-gray-300 rounded-lg focus:border-dia-green focus:outline-none"
              maxLength={6}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={code.length < 4}
            className="w-full py-3 px-4 bg-dia-green text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Bekijk wedstrijd
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">of</span>
          </div>
        </div>

        {/* Coach login */}
        <Link
          href="/coach"
          className="block w-full py-3 px-4 text-center border-2 border-dia-green text-dia-green font-semibold rounded-lg hover:bg-green-50 transition-colors"
        >
          Coach login
        </Link>

        {/* Referee login */}
        <Link
          href="/scheidsrechter"
          className="block w-full py-3 px-4 text-center border-2 border-gray-400 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          Scheidsrechter
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-400">
        <p>DIA Jeugdvoetbal</p>
      </footer>
    </main>
  );
}
