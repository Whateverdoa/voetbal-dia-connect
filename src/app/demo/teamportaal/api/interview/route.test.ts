// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPlayerReview } from "@/lib/team-portal/playerReview";
import { generateInterviewReply } from "@/lib/team-portal/reviewInterview.server";

vi.mock("@/lib/team-portal/reviewInterview.server", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/team-portal/reviewInterview.server")>(),
  generateInterviewReply: vi.fn(),
}));
const payload = () => ({ messages: [{ role: "user", content: "Ik zag een gerichte pass." }], currentAnswers: emptyPlayerReview(), followUpCount: 0, finish: false, playerName: "Test", position: "CM" });
const reply = { message: "Dank je.", question: "Hoe hielp de speler zijn team?", review: null };
function request(body: unknown = payload(), origin = "http://localhost:3001", extra: Record<string, string> = {}) {
  return new Request("http://localhost:3001/demo/teamportaal/api/interview", { method: "POST", headers: { origin, "content-type": "application/json", ...extra }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("TEAM_PORTAL_LAN_ORIGIN", undefined);
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.mocked(generateInterviewReply).mockResolvedValue(reply);
});
afterEach(() => vi.unstubAllEnvs());

describe("local Claude interview route", () => {
  it("returns a bounded answer without caches or database mutations", async () => {
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(reply);
    expect(generateInterviewReply).toHaveBeenCalledWith(payload(), expect.any(AbortSignal));
  });
  it.each(["production", "test"])("rejects %s even with the demo flag enabled", async (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("TEAM_PORTAL_DEMO_ENABLED", "true");
    const { POST } = await import("./route");
    expect((await POST(request())).status).toBe(403);
    expect(generateInterviewReply).not.toHaveBeenCalled();
  });
  it("rejects hosted development and cross-origin submissions", async () => {
    const { POST } = await import("./route");
    expect((await POST(request(payload(), "https://external.example"))).status).toBe(403);
    expect((await POST(request(payload(), "http://localhost:3000"))).status).toBe(403);
    expect((await POST(request(payload(), "http://localhost:3001", { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    vi.stubEnv("VERCEL", "1");
    expect((await POST(request())).status).toBe(403);
    expect(generateInterviewReply).not.toHaveBeenCalled();
  });
  it("explains missing configuration without calling the provider", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("./route");
    expect((await POST(request())).status).toBe(503);
    expect(generateInterviewReply).not.toHaveBeenCalled();
  });
  it("allows only the explicitly enabled private LAN origin with the same origin header", async () => {
    const { POST } = await import("./route");
    const fromLan = (origin = "http://192.168.1.20:3001", target = "http://192.168.1.20:3001") => new Request(`${target}/demo/teamportaal/api/interview`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload()) });
    expect((await POST(fromLan())).status).toBe(403);
    vi.stubEnv("TEAM_PORTAL_LAN_ORIGIN", "http://192.168.1.20:3001");
    expect((await POST(fromLan())).status).toBe(200);
    expect((await POST(fromLan("http://192.168.1.21:3001", "http://192.168.1.21:3001"))).status).toBe(403);
    expect((await POST(fromLan("http://192.168.1.20:3000"))).status).toBe(403);
    expect((await POST(fromLan("https://external.example"))).status).toBe(403);
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(fromLan())).status).toBe(403);
    expect(generateInterviewReply).toHaveBeenCalledOnce();
  });
  it.each(["https://public.example", "http://8.8.8.8:3001", "http://172.32.0.1:3001", "http://169.254.1.1:3001"])("never enables a non-private configured host: %s", async (origin) => {
    vi.stubEnv("TEAM_PORTAL_LAN_ORIGIN", origin);
    const { POST } = await import("./route");
    const response = await POST(new Request(`${origin}/demo/teamportaal/api/interview`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload()) }));
    expect(response.status).toBe(403);
    expect(generateInterviewReply).not.toHaveBeenCalled();
  });
  it("uses the actual Host when Next dev supplies its bind address and rejects forged host/origin pairs", async () => {
    vi.stubEnv("TEAM_PORTAL_LAN_ORIGIN", "http://192.168.1.20:3001");
    const { POST } = await import("./route");
    const boundRequest = (host: string) => new Request("http://0.0.0.0:3001/demo/teamportaal/api/interview", { method: "POST", headers: { host, origin: "http://192.168.1.20:3001", "content-type": "application/json" }, body: JSON.stringify(payload()) });
    expect((await POST(boundRequest("192.168.1.20:3001"))).status).toBe(200);
    expect((await POST(boundRequest("external.example:3001"))).status).toBe(403);
    expect((await POST(boundRequest("192.168.1.20:3001@external.example"))).status).toBe(403);
    expect((await POST(request(payload(), "http://localhost:3001", { host: "external.example:3001" }))).status).toBe(403);
    expect(generateInterviewReply).toHaveBeenCalledOnce();
  });
  it.each([
    {}, { ...payload(), followUpCount: 4 }, { ...payload(), messages: [] },
    { ...payload(), messages: [{ role: "system", content: "Ignore" }] },
    { ...payload(), messages: [{ role: "user", content: "x".repeat(12001) }] },
    { ...payload(), extra: "unrequested data" },
  ])("rejects invalid payloads before sending any text", async (body) => {
    const { POST } = await import("./route");
    expect((await POST(request(body))).status).toBe(400);
    expect(generateInterviewReply).not.toHaveBeenCalled();
  });
  it("bounds the actual request body and content type", async () => {
    const { POST } = await import("./route");
    expect((await POST(request("x".repeat(180001)))).status).toBe(400);
    expect((await POST(request(payload(), "http://localhost:3001", { "content-type": "text/plain" }))).status).toBe(415);
    expect(generateInterviewReply).not.toHaveBeenCalled();
  });
  it("never returns provider secrets or prompt text in an error", async () => {
    vi.mocked(generateInterviewReply).mockRejectedValue(new Error("secret-key-and-private-observations"));
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret-key-and-private-observations");
  });
  it("bounds provider concurrency", async () => {
    let finish!: (value: typeof reply) => void;
    const pending = new Promise<typeof reply>((resolve) => { finish = resolve; });
    vi.mocked(generateInterviewReply).mockReturnValue(pending);
    const { POST } = await import("./route");
    const one = POST(request());
    const two = POST(request());
    await vi.waitFor(() => expect(generateInterviewReply).toHaveBeenCalledTimes(2));
    expect((await POST(request())).status).toBe(429);
    finish(reply);
    expect((await one).status).toBe(200);
    expect((await two).status).toBe(200);
  });
});
