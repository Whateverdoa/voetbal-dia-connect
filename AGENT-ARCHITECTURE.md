# Agent Tools: Dual-Repo Adapter Pattern

## Architecture: One Agent, Two Backends

The AI agent speaks the same language regardless of which repo it's operating in.
The tool definitions stay the same — only the execution layer changes.

```
┌─────────────────────────────────────┐
│  Coach (voice or chat)              │
│  "Doelpunt Jens, assist van Kees"   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Agent (Claude + Tools)             │
│  System prompt: Dutch football      │
│  Tools: add_goal, substitute, etc.  │
└──────────┬──────────┬───────────────┘
           │          │
     ┌─────▼───┐  ┌──▼──────────┐
     │ Convex  │  │ Prisma/API  │
     │ adapter │  │ adapter     │
     │ (dia)   │  │ (WISSEL)    │
     └─────────┘  └─────────────┘
```

## Shared Tool Definitions

These are the Claude API tool definitions — identical for both repos:

```typescript
// src/lib/agent/tools.ts

export const MATCH_AGENT_TOOLS = [
  {
    name: "get_match_state",
    description: "Haal de huidige wedstrijdstatus op: stand, opstelling (wie op veld/bank), recente events, kwart.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_goal",
    description: "Registreer een doelpunt. Geef de naam van de scorer. Optioneel: assist-gever.",
    input_schema: {
      type: "object" as const,
      properties: {
        scorerName: { type: "string", description: "Naam van de doelpuntenmaker" },
        assistName: { type: "string", description: "Naam van de assist-gever (optioneel)" },
        isOwnGoal: { type: "boolean", description: "Eigen doelpunt" },
      },
      required: ["scorerName"],
    },
  },
  {
    name: "add_opponent_goal",
    description: "Registreer een tegendoelpunt.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "make_substitution",
    description: "Wissel spelers: één eruit (moet op veld staan), één erin (moet op bank zitten).",
    input_schema: {
      type: "object" as const,
      properties: {
        playerOutName: { type: "string", description: "Naam van speler die eruit gaat" },
        playerInName: { type: "string", description: "Naam van speler die erin komt" },
      },
      required: ["playerOutName", "playerInName"],
    },
  },
  {
    name: "undo_last",
    description: "Maak de laatste actie ongedaan (doelpunt, wissel, of kaart).",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "correct_score",
    description: "Pas de stand direct aan.",
    input_schema: {
      type: "object" as const,
      properties: {
        homeScore: { type: "number", description: "Thuisscore" },
        awayScore: { type: "number", description: "Uitscore" },
      },
      required: ["homeScore", "awayScore"],
    },
  },
  {
    name: "next_quarter",
    description: "Ga naar het volgende kwart of beëindig de wedstrijd.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "pause_match",
    description: "Pauzeer de wedstrijd met een reden (blessure, weer, overleg).",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string",
          enum: ["injury", "weather", "discussion", "technical", "other"],
          description: "Reden voor pauze",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "resume_match",
    description: "Hervat de wedstrijd na een pauze.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_playing_time",
    description: "Bekijk speeltijd per speler. Toont wie het minst heeft gespeeld.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "suggest_substitutions",
    description: "Stel wissels voor op basis van eerlijke speeltijd. Geeft aan wie het langst op de bank zit.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
] as const;
```

## System Prompt

```typescript
// src/lib/agent/system-prompt.ts

export const MATCH_AGENT_SYSTEM_PROMPT = `Je bent een wedstrijdassistent voor jeugdvoetbalclub DIA.
Je helpt coaches tijdens live wedstrijden. Je spreekt Nederlands.

## Wat je kunt:
- Stand bijhouden (doelpunten, tegendoelpunten)
- Wissels registreren (speler eruit, speler erin)
- Fouten corrigeren (ongedaan maken, stand aanpassen)
- Kwarten beheren (volgend kwart, pauze, hervatten)
- Speeltijd controleren (wie heeft het minst gespeeld)
- Wissels voorstellen (op basis van eerlijke speeltijd)

## Regels:
- Bevestig altijd de spelernaam voor je een actie uitvoert
- Bij twijfel over welke speler: vraag verduidelijking
- Wees kort en bondig — coach staat langs het veld
- Geef na elke actie de nieuwe stand of bevestiging
- Als een speler niet gevonden wordt, noem de beschikbare namen
- Gebruik geen Engels tenzij de coach Engels spreekt

## Speeltijd-advies:
Als de coach vraagt wie er gewisseld moet worden:
1. Bekijk wie het langst op de bank zit
2. Bekijk wie het minst heeft gespeeld dit seizoen (fairness counters)
3. Stel een concrete wissel voor: "[Naam] eruit, [Naam] erin"
4. Leg kort uit waarom (minste speeltijd, langst op bank)`;
```

## Adapter: dia-connect (Convex)

```typescript
// src/lib/agent/convex-adapter.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export function createConvexAdapter(convexUrl: string, matchId: string, pin: string) {
  const convex = new ConvexHttpClient(convexUrl);

  // Fuzzy name match helper
  function findPlayer(players: any[], name: string, mustBeOnField?: boolean) {
    const lower = name.toLowerCase();
    const match = players.find(p => {
      const nameMatch = p.name.toLowerCase().includes(lower) ||
                        lower.includes(p.name.toLowerCase().split(' ')[0]);
      if (mustBeOnField === true) return nameMatch && p.onField;
      if (mustBeOnField === false) return nameMatch && !p.onField;
      return nameMatch;
    });
    return match;
  }

  return {
    async get_match_state() {
      const match = await convex.query(api.matches.getForCoach, { matchId: matchId as any, pin });
      if (!match) return "Wedstrijd niet gevonden.";
      const onField = match.players.filter((p: any) => p.onField);
      const bench = match.players.filter((p: any) => !p.onField);
      return JSON.stringify({
        score: `${match.homeScore}-${match.awayScore}`,
        status: match.status,
        quarter: match.currentQuarter,
        teamName: match.teamName,
        onField: onField.map((p: any) => p.name),
        bench: bench.map((p: any) => p.name),
        recentEvents: match.events.slice(-5).map((e: any) => ({
          type: e.type, player: e.playerName, quarter: e.quarter,
        })),
      });
    },

    async add_goal(input: { scorerName: string; assistName?: string; isOwnGoal?: boolean }) {
      const match = await convex.query(api.matches.getForCoach, { matchId: matchId as any, pin });
      if (!match) return "Wedstrijd niet gevonden.";
      const scorer = findPlayer(match.players, input.scorerName);
      if (!scorer) return `Speler "${input.scorerName}" niet gevonden. Beschikbaar: ${match.players.map((p: any) => p.name).join(', ')}`;
      let assistId;
      if (input.assistName) {
        const assister = findPlayer(match.players, input.assistName);
        assistId = assister?.playerId;
      }
      await convex.mutation(api.matchActions.addGoal, {
        matchId: matchId as any, pin,
        playerId: scorer.playerId,
        assistPlayerId: assistId,
        isOwnGoal: input.isOwnGoal || false,
      });
      const updated = await convex.query(api.matches.getForCoach, { matchId: matchId as any, pin });
      return `⚽ Goal ${scorer.name}!${assistId ? ` Assist: ${input.assistName}` : ''} Stand: ${updated?.homeScore}-${updated?.awayScore}`;
    },

    async add_opponent_goal() {
      await convex.mutation(api.matchActions.addGoal, {
        matchId: matchId as any, pin, isOpponentGoal: true,
      });
      const updated = await convex.query(api.matches.getForCoach, { matchId: matchId as any, pin });
      return `Tegendoelpunt. Stand: ${updated?.homeScore}-${updated?.awayScore}`;
    },

    async make_substitution(input: { playerOutName: string; playerInName: string }) {
      const match = await convex.query(api.matches.getForCoach, { matchId: matchId as any, pin });
      if (!match) return "Wedstrijd niet gevonden.";
      const playerOut = findPlayer(match.players, input.playerOutName, true);
      const playerIn = findPlayer(match.players, input.playerInName, false);
      if (!playerOut) {
        const onField = match.players.filter((p: any) => p.onField).map((p: any) => p.name);
        return `"${input.playerOutName}" staat niet op het veld. Op veld: ${onField.join(', ')}`;
      }
      if (!playerIn) {
        const bench = match.players.filter((p: any) => !p.onField).map((p: any) => p.name);
        return `"${input.playerInName}" zit niet op de bank. Bank: ${bench.join(', ')}`;
      }
      await convex.mutation(api.matchActions.substitute, {
        matchId: matchId as any, pin,
        playerOutId: playerOut.playerId,
        playerInId: playerIn.playerId,
      });
      return `🔄 Wissel: ${playerOut.name} → bank, ${playerIn.name} → veld.`;
    },

    async undo_last() {
      const result = await convex.mutation(api.matchActions.undoLastEvent, { matchId: matchId as any, pin });
      return `↩️ Ongedaan gemaakt: ${result.undone}`;
    },

    async correct_score(input: { homeScore: number; awayScore: number }) {
      await convex.mutation(api.matchActions.correctScore, {
        matchId: matchId as any, pin,
        homeScore: input.homeScore, awayScore: input.awayScore,
      });
      return `Stand aangepast: ${input.homeScore}-${input.awayScore}`;
    },

    async next_quarter() {
      await convex.mutation(api.matchActions.nextQuarter, { matchId: matchId as any, pin });
      const updated = await convex.query(api.matches.getForCoach, { matchId: matchId as any, pin });
      if (updated?.status === 'finished') return "🏁 Wedstrijd afgelopen!";
      if (updated?.status === 'halftime') return "⏸️ Rust!";
      return `▶️ Kwart ${updated?.currentQuarter} gestart.`;
    },

    // Simplified for dia-connect (no rotation engine)
    async get_playing_time() {
      return "Speeltijd-tracking is nog niet beschikbaar in deze versie. Komt binnenkort.";
    },

    async suggest_substitutions() {
      const match = await convex.query(api.matches.getForCoach, { matchId: matchId as any, pin });
      if (!match) return "Wedstrijd niet gevonden.";
      const bench = match.players.filter((p: any) => !p.onField);
      if (bench.length === 0) return "Geen spelers op de bank.";
      return `Spelers op de bank: ${bench.map((p: any) => p.name).join(', ')}. Wie wil je wisselen?`;
    },

    async pause_match(_input: { reason: string }) {
      return "Pauzefunctie nog niet beschikbaar in dia-connect. Gebruik WISSEL voor pauze-ondersteuning.";
    },

    async resume_match() {
      return "Hervat-functie nog niet beschikbaar in dia-connect.";
    },
  };
}
```

## Adapter: WISSEL (Prisma API Routes)

```typescript
// src/lib/agent/wissel-adapter.ts
// This calls WISSEL's existing Next.js API routes

export function createWisselAdapter(baseUrl: string, matchId: string) {

  async function apiCall(path: string, method = 'GET', body?: any) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  return {
    async get_match_state() {
      const match = await apiCall(`/api/match/${matchId}`);
      const events = await apiCall(`/api/match/${matchId}/events`);
      // WISSEL has richer data: rotation plan, fairness counters, etc.
      return JSON.stringify({
        score: `${match.homeScore ?? 0}-${match.awayScore ?? 0}`,
        status: match.isLive ? 'live' : match.matchEndedAt ? 'finished' : 'scheduled',
        quarter: match.currentQuarter,
        isPaused: match.isPaused,
        players: match.players, // Full player list with positions
        recentEvents: events.slice(-5),
      });
    },

    async add_goal(input: { scorerName: string; assistName?: string; isOwnGoal?: boolean }) {
      await apiCall(`/api/match/${matchId}/score`, 'POST', {
        type: input.isOwnGoal ? 'OWN_GOAL' : 'GOAL',
        scorerName: input.scorerName,
        assistName: input.assistName,
      });
      const match = await apiCall(`/api/match/${matchId}`);
      return `⚽ Goal ${input.scorerName}! Stand: ${match.homeScore}-${match.awayScore}`;
    },

    async add_opponent_goal() {
      await apiCall(`/api/match/${matchId}/score`, 'POST', {
        type: 'OPPONENT_GOAL',
      });
      const match = await apiCall(`/api/match/${matchId}`);
      return `Tegendoelpunt. Stand: ${match.homeScore}-${match.awayScore}`;
    },

    async make_substitution(input: { playerOutName: string; playerInName: string }) {
      await apiCall(`/api/match/${matchId}/swap`, 'POST', {
        playerOutName: input.playerOutName,
        playerInName: input.playerInName,
      });
      return `🔄 Wissel: ${input.playerOutName} → bank, ${input.playerInName} → veld.`;
    },

    async undo_last() {
      const result = await apiCall(`/api/match/${matchId}/undo`, 'POST');
      return `↩️ Ongedaan gemaakt: ${result.undoneType ?? 'laatste actie'}`;
    },

    async correct_score(input: { homeScore: number; awayScore: number }) {
      // WISSEL may need a new endpoint for direct score correction
      // For now, use score events
      return `Score-correctie endpoint nog niet beschikbaar in WISSEL. Gebruik undo + opnieuw invoeren.`;
    },

    async next_quarter() {
      const match = await apiCall(`/api/match/${matchId}`);
      const nextQ = (match.currentQuarter ?? 0) + 1;
      if (match.currentQuarter) {
        await apiCall(`/api/match/${matchId}/quarter/${match.currentQuarter}/end`, 'POST');
      }
      if (nextQ <= 4) {
        await apiCall(`/api/match/${matchId}/quarter/${nextQ}/start`, 'POST');
        return `▶️ Kwart ${nextQ} gestart.`;
      }
      await apiCall(`/api/match/${matchId}/end`, 'POST');
      return "🏁 Wedstrijd afgelopen!";
    },

    async pause_match(input: { reason: string }) {
      await apiCall(`/api/match/${matchId}/pause`, 'POST', {
        reason: input.reason,
      });
      return `⏸️ Wedstrijd gepauzeerd (${input.reason}).`;
    },

    async resume_match() {
      await apiCall(`/api/match/${matchId}/resume`, 'POST');
      return `▶️ Wedstrijd hervat.`;
    },

    async get_playing_time() {
      // WISSEL tracks this via MatchEvent aggregation + fairness counters
      const events = await apiCall(`/api/match/${matchId}/events`);
      // Aggregate playing time from swap events
      // This is where WISSEL's rotation engine shines
      return JSON.stringify({
        note: "Speeltijd berekend uit events",
        events: events.filter((e: any) => e.type === 'SWAP' || e.type === 'QUARTER_START'),
      });
    },

    async suggest_substitutions() {
      // WISSEL can use the rotation plan + fairness counters
      const match = await apiCall(`/api/match/${matchId}`);
      const plan = await apiCall(`/api/plan/${matchId}`);
      // Compare actual vs planned subs
      return JSON.stringify({
        planned: plan?.benchPlan,
        currentQuarter: match.currentQuarter,
        note: "Gebaseerd op rotatieplan en fairness-counters",
      });
    },
  };
}
```

## Generic Agent Route (works with either adapter)

```typescript
// src/app/api/agent/chat/route.ts

import Anthropic from "@anthropic-ai/sdk";
import { MATCH_AGENT_TOOLS, MATCH_AGENT_SYSTEM_PROMPT } from "@/lib/agent/tools";
// Import the appropriate adapter based on env/config

export async function POST(request: Request) {
  const { message, matchId, pin, history, backend } = await request.json();

  // Select adapter based on backend flag
  // const adapter = backend === 'wissel'
  //   ? createWisselAdapter(process.env.WISSEL_API_URL!, matchId)
  //   : createConvexAdapter(process.env.NEXT_PUBLIC_CONVEX_URL!, matchId, pin);

  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: message },
  ];

  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: MATCH_AGENT_SYSTEM_PROMPT,
    tools: MATCH_AGENT_TOOLS as any,
    messages,
  });

  // Tool use loop
  while (response.stop_reason === "tool_use") {
    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tool of toolBlocks) {
      try {
        const fn = (adapter as any)[tool.name];
        const result = fn ? await fn(tool.input) : "Onbekende tool.";
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: String(result) });
      } catch (e: any) {
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Fout: ${e.message}`, is_error: true });
      }
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: MATCH_AGENT_SYSTEM_PROMPT,
      tools: MATCH_AGENT_TOOLS as any,
      messages,
    });
  }

  const textContent = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  return Response.json({
    reply: textContent?.text ?? "Geen antwoord.",
    messages: [...messages, { role: "assistant", content: response.content }],
  });
}
```

## Voice Hook (shared — works with either backend)

```typescript
// src/hooks/useVoiceAgent.ts
"use client";
import { useState, useRef, useCallback } from "react";

export function useVoiceAgent({
  matchId, pin, onTranscript, onAgentReply
}: {
  matchId: string;
  pin: string;
  onTranscript?: (text: string) => void;
  onAgentReply?: (text: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const historyRef = useRef<any[]>([]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Spraakherkenning niet beschikbaar");

    const recognition = new SR();
    recognition.lang = "nl-NL";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript?.(transcript);
      setIsListening(false);

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: transcript, matchId, pin,
            history: historyRef.current,
          }),
        });
        const data = await res.json();
        historyRef.current = data.messages;
        onAgentReply?.(data.reply);

        // Speak the reply through earpiece
        const utterance = new SpeechSynthesisUtterance(data.reply);
        utterance.lang = "nl-NL";
        utterance.rate = 1.1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      } catch {
        onAgentReply?.("Fout bij verwerking.");
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [matchId, pin, onTranscript, onAgentReply]);

  return { isListening, isSpeaking, startListening };
}
```
