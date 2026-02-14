"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { TeamsTab } from "@/components/admin/TeamsTab";
import { PlayersTab } from "@/components/admin/PlayersTab";
import { CoachesTab } from "@/components/admin/CoachesTab";
import { RefereesTab } from "@/components/admin/RefereesTab";
import { MatchesTab } from "@/components/admin/MatchesTab";
import { Lock, Users, UserCog, Shield, Flag, Calendar } from "lucide-react";

import { ADMIN_PIN } from "@/lib/constants";

type Tab = "wedstrijden" | "teams" | "spelers" | "coaches" | "scheidsrechters" | "setup";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("wedstrijden");

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
            active={activeTab === "wedstrijden"}
            onClick={() => setActiveTab("wedstrijden")}
            icon={<Calendar size={18} />}
            label="Wedstr."
          />
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
            active={activeTab === "scheidsrechters"}
            onClick={() => setActiveTab("scheidsrechters")}
            icon={<Flag size={18} />}
            label="Scheids."
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
          {activeTab === "wedstrijden" && <MatchesTabWrapper />}
          {activeTab === "teams" && <TeamsTabWrapper />}
          {activeTab === "spelers" && <PlayersTabWrapper />}
          {activeTab === "coaches" && <CoachesTabWrapper />}
          {activeTab === "scheidsrechters" && <RefereesTabWrapper />}
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

function MatchesTabWrapper() {
  const teams = useQuery(api.admin.listAllTeams);
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Wedstrijden beheren</h2>
      <MatchesTab teams={teams} />
    </div>
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

function RefereesTabWrapper() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Scheidsrechters beheren</h2>
      <RefereesTab />
    </div>
  );
}

function SetupTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Setup & Seed Data</h2>
      <p className="text-sm text-gray-600 mb-4">
        Seed DIA club met teams, spelers, coaches, scheidsrechters en wedstrijden.
        Idempotent: kan veilig meerdere keren worden uitgevoerd.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-gray-700">Seed via terminal</h3>
        <code className="block bg-gray-200 px-3 py-2 rounded text-sm font-mono">
          npx convex run seed:init
        </code>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Dit maakt aan:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>DIA club met 3 teams (JO11-1, JO12-1, JO13-2)</li>
            <li>14 spelers per team</li>
            <li>4 coaches (PIN: 1234, 5678, 2468, 1357)</li>
            <li>4 scheidsrechters (PIN: 7777, 8888, 6666, 5555)</li>
            <li>3 wedstrijden voor JO12-1 met scheidsrechter toewijzingen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
