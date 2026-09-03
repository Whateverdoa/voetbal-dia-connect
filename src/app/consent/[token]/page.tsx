"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

export default function ConsentPage() {
  const params = useParams();
  const token = String(params.token ?? "");
  const data = useQuery(api.playerConsents.getByToken, { token });
  const submit = useMutation(api.playerConsents.submitConsent);

  const [photo, setPhoto] = useState(true);
  const [gamification, setGamification] = useState(true);
  const [publicDisplay, setPublicDisplay] = useState(true);
  const [grantedBy, setGrantedBy] = useState<"parent" | "player">("parent");
  const [parentEmail, setParentEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (data === undefined) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">Laden…</p>
      </main>
    );
  }

  if (data === null) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-6 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Link ongeldig</h1>
          <p className="text-gray-600">
            Deze toestemmingslink bestaat niet of is verlopen. Vraag de club om een
            nieuwe link.
          </p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-6 text-center space-y-2">
          <h1 className="text-xl font-bold text-dia-black">Bedankt</h1>
          <p className="text-gray-600">
            Je keuzes voor {data.playerName} ({data.teamName}) zijn opgeslagen. Je
            kunt ze later herroepen via de club.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form
        className="max-w-lg w-full bg-white rounded-xl shadow p-6 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await submit({
              token,
              choices: {
                photo,
                gamification,
                public_display: publicDisplay,
              },
              grantedBy,
              parentEmail: parentEmail.trim() || undefined,
            });
            setDone(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Opslaan mislukt");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-dia-black font-semibold">
            DIA Live · AVG toestemming
          </p>
          <h1 className="text-2xl font-bold mt-1">{data.playerName}</h1>
          <p className="text-gray-600">{data.teamName}</p>
          <p className="text-xs text-gray-400 mt-1">
            Documentversie: {data.documentVersion}
          </p>
        </div>

        <p className="text-sm text-gray-700">
          Voor selectieteams (zoals JO13-1/JO13-2) willen we foto&apos;s en
          spelerskaarten tonen op het tactiekbord / TV. Geef per onderdeel aan of
          je akkoord gaat. Zonder toestemming tonen we alleen rugnummer en
          initialen.
        </p>

        <fieldset className="space-y-3">
          <ConsentToggle
            label="Publieke weergave (naam op TV / presentatie)"
            checked={publicDisplay}
            onChange={setPublicDisplay}
          />
          <ConsentToggle
            label="Foto op spelerskaart"
            checked={photo}
            onChange={setPhoto}
          />
          <ConsentToggle
            label="Gamificatie (XP, levels, badges)"
            checked={gamification}
            onChange={setGamification}
          />
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Ik geef toestemming als</label>
          <select
            value={grantedBy}
            onChange={(e) => setGrantedBy(e.target.value as "parent" | "player")}
            className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
          >
            <option value="parent">Ouder / verzorger</option>
            <option value="player">Speler</option>
          </select>
          <input
            type="email"
            placeholder="E-mail (optioneel)"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 min-h-[44px]"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-dia-green text-white font-bold rounded-xl py-3 min-h-[48px] disabled:opacity-50"
        >
          {busy ? "Opslaan…" : "Keuzes opslaan"}
        </button>
      </form>
    </main>
  );
}

function ConsentToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
      <input
        type="checkbox"
        className="mt-1 w-5 h-5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </label>
  );
}
