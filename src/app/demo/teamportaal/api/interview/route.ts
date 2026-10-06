import { generateInterviewReply, interviewRequestSchema } from "@/lib/team-portal/reviewInterview.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 180000;
const requestTimes: number[] = [];
let activeRequests = 0;
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

function allowedDevelopmentOrigin(url: URL): boolean {
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return true;
  // Opt in to one private LAN origin for a phone test, never arbitrary hosts.
  if (url.origin !== process.env.TEAM_PORTAL_LAN_ORIGIN) return false;
  const parts = url.hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

function localRequest(request: Request): boolean {
  const internalUrl = new URL(request.url);
  // Next dev can construct request.url from its bind address (0.0.0.0).
  // Compare the browser origin with the actual Host, never forwarded headers.
  const host = request.headers.get("host") ?? internalUrl.host;
  if (/[\\/@?#\s]/.test(host)) return false;
  let url: URL;
  try { url = new URL(`${internalUrl.protocol}//${host}`); } catch { return false; }
  return process.env.NODE_ENV === "development" && (!process.env.VERCEL || process.env.VERCEL === "0") &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") &&
    allowedDevelopmentOrigin(url) &&
    request.headers.get("origin") === url.origin &&
    !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "");
}

async function readBody(request: Request): Promise<unknown> {
  if (!request.body || Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("BODY_LIMIT");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error("BODY_LIMIT"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  if (!localRequest(request)) return error("De gespreksassistent is alleen beschikbaar in de lokale proefversie.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return error("Stuur het gesprek als tekstgegevens.", 415);
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return error("De Claude-koppeling is nog niet ingesteld. Je tekst blijft staan; je kunt ook het formulier gebruiken.", 503);
  let body: unknown;
  try { body = await readBody(request); } catch { return error("Dit gesprek is te groot of kon niet worden gelezen. Kort het iets in en probeer opnieuw.", 400); }
  const parsed = interviewRequestSchema.safeParse(body);
  if (!parsed.success) return error("Controleer je gesprek. Gebruik maximaal 12 berichten, 12.000 tekens per bericht en 3 vervolgvragen.", 400);
  const now = Date.now();
  while (requestTimes.length && requestTimes[0] <= now - 60000) requestTimes.shift();
  if (activeRequests >= 2 || requestTimes.length >= 20) return error("De assistent is even bezig. Je tekst blijft staan; probeer het zo nog eens.", 429);
  requestTimes.push(now);
  activeRequests++;
  try {
    const reply = await generateInterviewReply(parsed.data, AbortSignal.any([request.signal, AbortSignal.timeout(45000)]));
    return Response.json(reply, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Provider errors may include submitted text or headers. Never return/log them.
    return error("Claude kon nu geen antwoord maken. Je tekst blijft staan. Probeer opnieuw of ga verder in het formulier.", 502);
  } finally { activeRequests--; }
}
