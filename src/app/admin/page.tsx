"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { TeamsTab } from "@/components/admin/TeamsTab";
import { PlayersTab } from "@/components/admin/PlayersTab";
import { CoachesTab } from "@/components/admin/CoachesTab";
import { Lock, Users, UserCog, Shield } from "lucide-react";

import { ADMIN_PIN } from "@/lib/constants";

type Tab = "teams" | "spelers" | "coaches" | "setup";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("teams");

  // Check session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("admin_auth");
    if (stored === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-dia-green rounded-full flex items-center justify-center">
              <Lock className="text-white" size={24} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center mb-4">Admin toegang</h1>
          <div className="space-y-3">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              placeholder="Admin PIN"
              className={`w-full px-4 py-3 border rounded-lg text-center text-lg font-mono ${
                pinError ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              autoFocus
            />
            {pinError && (
              <p className="text-red-600 text-sm text-center">Ongeldige PIN</p>
            )}
            <button
              onClick={handlePinSubmit}
              disabled={!pinInput}
              className="w-full py-3 bg-dia-green text-white rounded-lg font-semibold disabled:bg-gray-300"
            >
              Inloggen
            </button>
          </div>
          <Link
            href="/"
            className="block text-center text-sm text-gray-500 mt-4 hover:underline"
          >
            ← Terug naar home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-dia-green text-white p-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-white/80 hover:text-white text-sm">
              ← Home
            </Link>
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("admin_auth");
              setIsAuthenticated(false);
            }}
            className="text-sm text-white/80 hover:text-white"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-[72px] z-30">
        <div className="max-w-4xl mx-auto flex">
          <TabButton
            active={activeTab === "teams"}
            onClick={() => setActiveTab("teams")}
            icon={<Shield size={18} />}
            label="Teams"
          />
          <TabButton
            active={activeTab === "spelers"}
            onClick={() => setActiveTab("spelers")}
            icon={<Users size={18} />}
            label="Spelers"
          />
          <TabButton
            active={activeTab === "coaches"}
            onClick={() => setActiveTab("coaches")}
            icon={<UserCog size={18} />}
            label="Coaches"
          />
          <TabButton
            active={activeTab === "setup"}
            onClick={() => setActiveTab("setup")}
            icon={<Lock size={18} />}
            label="Setup"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4">
          {activeTab === "teams" && <TeamsTabWrapper />}
          {activeTab === "spelers" && <PlayersTabWrapper />}
          {activeTab === "coaches" && <CoachesTabWrapper />}
          {activeTab === "setup" && <SetupTab />}
        </div>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-dia-green text-dia-green"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TeamsTabWrapper() {
  const clubs = useQuery(api.admin.listClubs);
  const firstClubId = clubs?.[0]?._id as Id<"clubs"> | null;
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Teams beheren</h2>
      {clubs === undefined ? (
        <p className="text-gray-500">Laden...</p>
      ) : clubs.length === 0 ? (
        <p className="text-gray-500">
          Geen clubs gevonden. Ga naar Setup om data te seeden.
        </p>
      ) : (
        <TeamsTab clubId={firstClubId} />
      )}
    </div>
  );
}

function PlayersTabWrapper() {
  const teams = useQuery(api.admin.listAllTeams);
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Spelers beheren</h2>
      <PlayersTab teams={teams} />
    </div>
  );
}

function CoachesTabWrapper() {
  const teams = useQuery(api.admin.listAllTeams);
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Coaches beheren</h2>
      <CoachesTab teams={teams} />
    </div>
  );
}

function SetupTab() {
  const [message, setMessage] = useState("");
  const seedDIA = useMutation(api.admin.seedDIA);
  const seedMatches = useMutation(api.admin.seedMatches);

  const handleSeed = async () => {
    try {
      const result = await seedDIA({ adminPin: ADMIN_PIN });
      setMessage(
        `✅ ${result.message}. Default PIN: ${result.defaultPin || "1234"}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      setMessage(`❌ Error: ${message}`);
    }
  };

  const handleSeedMatches = async () => {
    try {
      const result = await seedMatches({ adminPin: ADMIN_PIN });
      setMessage(
        `✅ ${result.message}\n${result.matches
          .map(
            (m: { date: string; opponent: string; code: string; result: string | null }) =>
              `${m.date.slice(0, 10)} - ${m.opponent} (${m.code})${
                m.result ? ` → ${m.result}` : ""
              }`
          )
          .join("\n")}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      setMessage(`❌ Error: ${message}`);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Setup & Seed Data</h2>
      <p className="text-sm text-gray-600 mb-4">
        Seed DIA club met JO12-1 team en sample spelers voor development.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSeed}
          className="px-4 py-2 bg-dia-green text-white rounded-lg hover:bg-green-700"
        >
          1. Seed DIA Data
        </button>
        <button
          onClick={handleSeedMatches}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          2. Seed Wedstrijden
        </button>
      </div>
      {message && (
        <pre className="mt-4 text-sm p-3 bg-gray-100 rounded whitespace-pre-wrap">
          {message}
        </pre>
      )}
    </div>
  );
}
