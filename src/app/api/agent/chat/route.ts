/**
 * Agent chat API route — Claude tool-use loop.
 * POST /api/agent/chat
 *
 * Accepts: { message, matchId, pin, history }
 * Returns: { reply, messages }
 */
import Anthropic from "@anthropic-ai/sdk";
import { MATCH_AGENT_TOOLS } from "@/lib/agent/tools";
import { MATCH_AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { createConvexAdapter } from "@/lib/agent/convex-adapter";

const MAX_TOOL_ROUNDS = 5; // Safety limit to prevent infinite loops

interface ChatRequest {
  message: string;
  matchId: string;
  pin: string;
  history: Anthropic.MessageParam[];
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Assistent tijdelijk niet beschikbaar." },
      { status: 500 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return Response.json(
      { error: "Assistent tijdelijk niet beschikbaar." },
      { status: 500 },
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Ongeldig verzoek." },
      { status: 400 },
    );
  }

  const { message, matchId, pin, history = [] } = body;

  if (!message || !matchId || !pin) {
    return Response.json(
      { error: "Bericht en verificatie ontbreken. Probeer opnieuw." },
      { status: 400 },
    );
  }

  const adapter = createConvexAdapter(convexUrl, matchId, pin);
  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: message },
  ];

  try {
    let response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: MATCH_AGENT_SYSTEM_PROMPT,
      tools: MATCH_AGENT_TOOLS as unknown as Anthropic.Tool[],
      messages,
    });

    // Tool-use loop: execute tools until Claude returns text
    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tool of toolBlocks) {
        try {
          const fn = adapter[tool.name as keyof typeof adapter];
          const result = fn
            ? await fn(tool.input as Record<string, unknown>)
            : "Onbekende tool.";
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: String(result),
          });
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Onbekende fout";
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: `Fout: ${errorMessage}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: MATCH_AGENT_SYSTEM_PROMPT,
        tools: MATCH_AGENT_TOOLS as unknown as Anthropic.Tool[],
        messages,
      });
    }

    const textContent = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );

    return Response.json({
      reply: textContent?.text ?? "Geen antwoord.",
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
      ],
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Onbekende fout";
    console.error("Agent chat error:", errorMessage);
    return Response.json(
      { error: `Fout bij het verwerken: ${errorMessage}` },
      { status: 500 },
    );
  }
}
