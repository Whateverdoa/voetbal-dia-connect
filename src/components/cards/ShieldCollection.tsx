"use client";

import { useState } from "react";
import { ShieldCard } from "./ShieldCard";
import { FootballShieldContent, FOOTBALL_SHIELD_STATS, averageFootballShieldRating, type FootballShieldStats } from "./FootballShieldContent";
import { shieldAsset, shieldVectorAsset, SHIELD_THEMES, type ShieldSeries } from "@/lib/cards/shieldThemes";

export function ShieldCollection() {
  const [series, setSeries] = useState<ShieldSeries>("abstract");
  const [showExample, setShowExample] = useState(true);
  const [surface, setSurface] = useState<"dark" | "light" | "pitch">("dark");
  const [name, setName] = useState("JOUW NAAM");
  const [position, setPosition] = useState("CM");
  const [stats, setStats] = useState<FootballShieldStats>({});

  return (
    <main className="min-h-screen bg-[#090e12] text-white">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="mb-10 max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">DIA Live / Collectie 26–27</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Jouw spel. Jouw schild.</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">Twee series, zes kleuren. Kies de rustige, abstracte schilden of de rijke metalen uitvoering. Alle ruimte voor eigen gegevens, zonder spelersfoto of shirt.</p>
        </header>

        <section aria-label="Voorbeeldinstellingen" className="mb-9 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-white/10 pb-5" role="group" aria-label="Schildenserie">
            <span className="mr-1 text-sm text-slate-400">Serie</span>
            {([["abstract", "Abstract"], ["premium", "Premium"]] as const).map(([value, title]) => (
              <button key={value} type="button" aria-pressed={series === value} onClick={() => setSeries(value)} className={`min-h-11 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 ${series === value ? "bg-emerald-300 text-emerald-950" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>{title}</button>
            ))}
            <p className="w-full text-xs text-slate-400 sm:w-auto sm:pl-2">{series === "abstract" ? "Strakke lijnen · matte vlakken · bewerkbare SVG" : "Metalen randen · rijke texturen · premium glans"}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Achtergrond">
              {([['dark', 'Donker'], ['light', 'Licht'], ['pitch', 'Veld']] as const).map(([value, title]) => (
                <button key={value} type="button" aria-pressed={surface === value} onClick={() => setSurface(value)} className={`min-h-11 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 ${surface === value ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{title}</button>
              ))}
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={showExample} onChange={(event) => setShowExample(event.target.checked)} className="h-5 w-5 accent-emerald-400" />
              Toon voorbeeldgegevens
            </label>
          </div>
          {showExample ? (
            <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
              <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-xs text-slate-300">Naam<input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 px-3 text-sm text-white focus:outline-2 focus:outline-emerald-300" /></label>
              <label className="text-xs text-slate-300">Gemiddelde<input readOnly value={averageFootballShieldRating(stats) ?? "—"} className="mt-2 block min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 text-sm text-slate-300" /></label>
              <label className="text-xs text-slate-300">Positie<input value={position} maxLength={5} onChange={(event) => setPosition(event.target.value.toUpperCase())} className="mt-2 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 px-3 text-sm text-white focus:outline-2 focus:outline-emerald-300" /></label>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {FOOTBALL_SHIELD_STATS.map(({ key, label, name: statName }) => (
                  <label key={key} className="text-xs text-slate-300">{label}
                    <input type="number" min={0} max={99} step={1} inputMode="numeric" aria-label={`${label} — ${statName}`} placeholder="—" value={stats[key] ?? ""} onChange={(event) => {
                      const value = event.target.value;
                      const parsed = Number(value);
                      setStats((current) => ({ ...current, [key]: value === "" || !Number.isFinite(parsed) ? undefined : Math.min(99, Math.max(0, Math.trunc(parsed))) }));
                    }} className="mt-2 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 px-3 text-sm text-white focus:outline-2 focus:outline-emerald-300" />
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">Het gemiddelde verschijnt zodra alle zes waarden zijn ingevuld. Voorbeeldwaarden worden niet opgeslagen.</p>
            </div>
          ) : null}
        </section>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SHIELD_THEMES.map((theme, index) => (
            <article key={theme.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#10171d]">
              <div className={`px-8 pb-3 pt-6 sm:px-10 ${surface === 'light' ? 'bg-slate-100' : surface === 'pitch' ? 'bg-gradient-to-br from-[#1b5e20] to-[#0d3118]' : 'bg-[radial-gradient(ellipse_at_center,#243039_0%,#0c1217_75%)]'}`}>
                <ShieldCard theme={theme.id} series={series} contentLayout="football" label={`${theme.name} ${series === "abstract" ? "abstract" : "premium"} schild${showExample ? ` met voorbeeldgegevens voor ${name}` : ', leeg'}`}>
                  {showExample ? (
                    <FootballShieldContent name={name || "JOUW NAAM"} position={position} stats={stats} />
                  ) : null}
                </ShieldCard>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{theme.name}</h2><span className="font-mono text-xs text-slate-500">0{index + 1} / 06</span></div>
                <p className="mt-1 text-xs text-slate-400">{series === "abstract" ? "Matte vlakken · subtiel geometrisch accent" : theme.subtitle}</p>
                <div className="mt-5 flex gap-2">
                  <a href={shieldAsset(theme.id, 'png', series)} download className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300" aria-label={`Download leeg ${series === "abstract" ? "abstract " : ""}${theme.name.toLowerCase()} schild als transparante PNG`}>Download PNG <span className="ml-2 text-slate-400" aria-hidden="true">↓</span></a>
                  {series === "abstract" ? <a href={shieldVectorAsset(theme.id)} download className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300" aria-label={`Download bewerkbaar ${theme.name.toLowerCase()} schild als SVG`}>SVG <span className="ml-2 text-slate-400" aria-hidden="true">↓</span></a> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-xs leading-relaxed text-slate-400"><p>{series === "abstract" ? "Bewerkbare SVG · Transparante PNG · WebP voor de app" : "Transparante PNG · WebP voor de app"}</p><p>Eigen DIA-collectie, geïnspireerd op voetbalkaarten.</p></footer>
      </div>
    </main>
  );
}
