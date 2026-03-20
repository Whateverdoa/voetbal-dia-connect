"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { CalendarRange, Lock, Settings2, Shield, UserCog, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AssignmentBoard } from "./AssignmentBoard";
import { CoachesTab } from "./CoachesTab";
import { PlayersTab } from "./PlayersTab";
import { RefereesTab } from "./RefereesTab";
import { TeamsTab } from "./TeamsTab";

type AdminView = "toewijzing" | "beheer";
type ManagementTab = "teams" | "spelers" | "coaches" | "scheidsrechters" | "setup";

function WorkspaceToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
        active
          ? "bg-dia-green text-white"
          : "bg-white text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function ManagementButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-dia-green bg-emerald-50 text-dia-green"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function AdminWorkspace({ onLogout }: { onLogout: () => void }) {
  const [activeView, setActiveView] = useState<AdminView>("toewijzing");
  const [managementTab, setManagementTab] = useState<ManagementTab>("teams");
  const clubs = useQuery(api.admin.listClubs);
  const teams = useQuery(api.admin.listAllTeams);
  const firstClubId = clubs?.[0]?._id as Id<"clubs"> | null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8f4_0%,#f8fafc_32%,#eef4f8_100%)]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-700">
              ← Home
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Admin werkplek</h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="rounded-[32px] border border-white/60 bg-white/75 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dia-green">DIA admin</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Overzicht voor toewijzen en beheer</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Gebruik toewijzing voor wedstrijden en scheidsrechters. Beheer blijft beschikbaar voor teams, spelers, coaches en setup.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1.5">
              <WorkspaceToggle
                active={activeView === "toewijzing"}
                label="Toewijzing"
                onClick={() => setActiveView("toewijzing")}
              />
              <WorkspaceToggle
                active={activeView === "beheer"}
                label="Beheer"
                onClick={() => setActiveView("beheer")}
              />
            </div>
          </div>
        </section>

        <div className="mt-6">
          {activeView === "toewijzing" ? (
            <AssignmentBoard />
          ) : (
            <section className="space-y-5 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Beheer</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Basisgegevens onderhouden</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <ManagementButton
                  active={managementTab === "teams"}
                  icon={<Shield size={16} />}
                  label="Teams"
                  onClick={() => setManagementTab("teams")}
                />
                <ManagementButton
                  active={managementTab === "spelers"}
                  icon={<Users size={16} />}
                  label="Spelers"
                  onClick={() => setManagementTab("spelers")}
                />
                <ManagementButton
                  active={managementTab === "coaches"}
                  icon={<UserCog size={16} />}
                  label="Coaches"
                  onClick={() => setManagementTab("coaches")}
                />
                <ManagementButton
                  active={managementTab === "scheidsrechters"}
                  icon={<CalendarRange size={16} />}
                  label="Scheidsrechters"
                  onClick={() => setManagementTab("scheidsrechters")}
                />
                <ManagementButton
                  active={managementTab === "setup"}
                  icon={<Settings2 size={16} />}
                  label="Setup"
                  onClick={() => setManagementTab("setup")}
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                {managementTab === "teams" && (
                  <div>
                    <h4 className="mb-4 text-lg font-semibold text-slate-900">Teams beheren</h4>
                    {clubs === undefined ? (
                      <p className="text-sm text-slate-500">Clubs laden...</p>
                    ) : clubs.length === 0 ? (
                      <p className="text-sm text-slate-500">Geen clubs gevonden. Gebruik Setup om seed-data te laden.</p>
                    ) : (
                      <TeamsTab clubId={firstClubId} />
                    )}
                  </div>
                )}

                {managementTab === "spelers" && (
                  <div>
                    <h4 className="mb-4 text-lg font-semibold text-slate-900">Spelers beheren</h4>
                    <PlayersTab teams={teams} />
                  </div>
                )}

                {managementTab === "coaches" && (
                  <div>
                    <h4 className="mb-4 text-lg font-semibold text-slate-900">Coaches beheren</h4>
                    <CoachesTab teams={teams} />
                  </div>
                )}

                {managementTab === "scheidsrechters" && (
                  <div>
                    <h4 className="mb-4 text-lg font-semibold text-slate-900">Scheidsrechters beheren</h4>
                    <RefereesTab />
                  </div>
                )}

                {managementTab === "setup" && <SetupPanel />}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function SetupPanel() {
  return (
    <div>
      <h4 className="mb-4 text-lg font-semibold text-slate-900">Setup & seed-data</h4>
      <p className="mb-4 text-sm text-slate-600">
        Seed DIA met teams, spelers, coaches, scheidsrechters en wedstrijden. Deze setup is idempotent.
      </p>
      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Lock size={16} />
          Seed via terminal
        </div>
        <code className="mt-3 block rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-50">
          npx convex run seed:init
        </code>
        <div className="mt-4 space-y-1 text-sm text-slate-600">
          <p>DIA club met teams</p>
          <p>Spelers, coaches en scheidsrechters</p>
          <p>Voorbeeldwedstrijden met toewijzingen</p>
        </div>
      </div>
    </div>
  );
}
