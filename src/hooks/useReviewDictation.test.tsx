import { act, cleanup, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReviewDictation } from "./useReviewDictation";

interface ResultEvent {
  results: Array<{ isFinal: boolean; 0: { transcript: string } }>;
}

class MockRecognition {
  static instances: MockRecognition[] = [];
  static startError: Error | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: ResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => { if (MockRecognition.startError) throw MockRecognition.startError; });
  stop = vi.fn();
  abort = vi.fn();

  constructor() { MockRecognition.instances.push(this); }
  result(...chunks: Array<[string, boolean]>) {
    this.onresult?.({ results: chunks.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } })) });
  }
}

function currentRecognition() { return MockRecognition.instances[MockRecognition.instances.length - 1]; }

beforeEach(() => {
  vi.useFakeTimers();
  MockRecognition.instances = [];
  MockRecognition.startError = null;
  vi.stubGlobal("SpeechRecognition", MockRecognition);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("review dictation", () => {
  it("starts only on request and configures Dutch continuous recognition", () => {
    const { result } = renderHook(() => useReviewDictation({ onTranscript: vi.fn() }));
    expect(result.current.supported).toBe(true);
    expect(result.current.listening).toBe(false);
    expect(MockRecognition.instances).toHaveLength(0);
    act(() => { result.current.start(); result.current.start(); });
    expect(MockRecognition.instances).toHaveLength(1);
    expect(currentRecognition()).toMatchObject({ lang: "nl-NL", continuous: true, interimResults: true });
    expect(currentRecognition().start).toHaveBeenCalledOnce();
    expect(result.current.listening).toBe(true);
  });

  it("supports the prefixed browser API", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", MockRecognition);
    const { result } = renderHook(() => useReviewDictation({ onTranscript: vi.fn() }));
    expect(result.current.supported).toBe(true);
    act(() => result.current.start());
    expect(currentRecognition().start).toHaveBeenCalledOnce();
  });

  it("explains the keyboard fallback in unsupported browsers", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    const { result } = renderHook(() => useReviewDictation({ onTranscript: vi.fn() }));
    expect(result.current.supported).toBe(false);
    act(() => { result.current.start(); result.current.stop(); });
    expect(result.current.error).toContain("dicteerfunctie van je toetsenbord");
    expect(result.current.listening).toBe(false);
  });

  it("uses a stable server snapshot and hydrates without starting the microphone", async () => {
    function Probe() {
      const { supported } = useReviewDictation({ onTranscript: () => {} });
      return <span>{supported ? "beschikbaar" : "niet beschikbaar"}</span>;
    }
    const container = document.createElement("div");
    const html = renderToString(<Probe />);
    expect(html).toContain("niet beschikbaar");
    container.innerHTML = html;
    const onRecoverableError = vi.fn();
    const root = hydrateRoot(container, <Probe />, { onRecoverableError });
    await act(async () => {});
    expect(container.textContent).toBe("beschikbaar");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(MockRecognition.instances).toHaveLength(0);
    act(() => root.unmount());
  });

  it("emits only new final chunks from cumulative results and updates interim text", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useReviewDictation({ onTranscript }));
    act(() => result.current.start());
    const recognition = currentRecognition();
    act(() => recognition.result(["Hij gaf", false]));
    expect(result.current.interim).toBe("Hij gaf");
    expect(onTranscript).not.toHaveBeenCalled();
    act(() => recognition.result([" Hij gaf een pass. ", true], ["Daarna", false]));
    expect(onTranscript).toHaveBeenLastCalledWith("Hij gaf een pass.");
    expect(result.current.interim).toBe("Daarna");
    act(() => recognition.result(["Hij gaf een pass.", true], ["Daarna liep hij vrij.", true]));
    act(() => recognition.result(["Hij gaf een pass.", true], ["Daarna liep hij vrij.", true]));
    expect(onTranscript.mock.calls).toEqual([["Hij gaf een pass."], ["Daarna liep hij vrij."]]);
    expect(result.current.interim).toBe("");
  });

  it("allows repeated words at new result indices and shrinking interim hypotheses", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useReviewDictation({ onTranscript }));
    act(() => result.current.start());
    const recognition = currentRecognition();
    act(() => recognition.result(["Goed.", true], ["Misschien", false], ["wel", false]));
    expect(result.current.interim).toBe("Misschien wel");
    act(() => recognition.result(["Goed.", true]));
    expect(result.current.interim).toBe("");
    act(() => recognition.result(["Goed.", true], ["Goed.", true], ["", true]));
    expect(onTranscript.mock.calls).toEqual([["Goed."], ["Goed."]]);
  });

  it("uses the latest callback without restarting an active session", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ onTranscript }) => useReviewDictation({ onTranscript }), { initialProps: { onTranscript: first } });
    act(() => result.current.start());
    rerender({ onTranscript: second });
    act(() => currentRecognition().result(["Nieuwe tekst", true]));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("Nieuwe tekst");
    expect(MockRecognition.instances).toHaveLength(1);
  });

  it("waits for the final result and end event when stopping", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useReviewDictation({ onTranscript }));
    act(() => result.current.start());
    const recognition = currentRecognition();
    act(() => { result.current.stop(); result.current.stop(); result.current.start(); });
    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(result.current.listening).toBe(true);
    expect(MockRecognition.instances).toHaveLength(1);
    act(() => recognition.result(["De laatste woorden.", true]));
    expect(onTranscript).toHaveBeenCalledWith("De laatste woorden.");
    act(() => recognition.onend?.());
    expect(result.current.listening).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(recognition.abort).not.toHaveBeenCalled();
  });

  it("aborts after a bounded stop timeout and ignores late results", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useReviewDictation({ onTranscript }));
    act(() => result.current.start());
    const recognition = currentRecognition();
    const lateResult = recognition.onresult;
    act(() => result.current.stop());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toContain("laatste woorden");
    expect(recognition.abort).toHaveBeenCalledOnce();
    act(() => lateResult?.({ results: [{ isFinal: true, 0: { transcript: "Te laat" } }] }));
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it.each([
    ["not-allowed", "toegang tot de microfoon"],
    ["service-not-allowed", "toegang tot de microfoon"],
    ["network", "verbinding"],
    ["no-speech", "geen spraak herkend"],
    ["audio-capture", "microfoon is niet beschikbaar"],
  ])("handles %s in Dutch and releases the session", (code, message) => {
    const { result } = renderHook(() => useReviewDictation({ onTranscript: vi.fn() }));
    act(() => result.current.start());
    const recognition = currentRecognition();
    act(() => recognition.onerror?.({ error: code }));
    expect(result.current.error).toContain(message);
    expect(result.current.listening).toBe(false);
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(recognition.onresult).toBeNull();
  });

  it("begins a fresh result sequence after end and ignores the old session", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useReviewDictation({ onTranscript }));
    act(() => result.current.start());
    const first = currentRecognition();
    const staleError = first.onerror;
    const staleEnd = first.onend;
    act(() => first.result(["Eerste", true]));
    act(() => first.onend?.());
    act(() => result.current.start());
    act(() => { staleError?.({ error: "network" }); staleEnd?.(); });
    expect(result.current.listening).toBe(true);
    expect(result.current.error).toBe("");
    act(() => currentRecognition().result(["Tweede", true]));
    expect(onTranscript.mock.calls).toEqual([["Eerste"], ["Tweede"]]);
  });

  it("aborts and detaches all handlers on unmount, including pending stop timeout", () => {
    const onTranscript = vi.fn();
    const { result, unmount } = renderHook(() => useReviewDictation({ onTranscript }));
    act(() => result.current.start());
    const recognition = currentRecognition();
    const lateResult = recognition.onresult;
    act(() => result.current.stop());
    unmount();
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onend).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    act(() => lateResult?.({ results: [{ isFinal: true, 0: { transcript: "Verlate tekst" } }] }));
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("recovers from synchronous permission failure and clears it for the next request", () => {
    MockRecognition.startError = new DOMException("Denied", "NotAllowedError");
    const { result } = renderHook(() => useReviewDictation({ onTranscript: vi.fn() }));
    act(() => result.current.start());
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toContain("toegang tot de microfoon");
    expect(currentRecognition().abort).toHaveBeenCalledOnce();
    MockRecognition.startError = null;
    act(() => result.current.start());
    expect(result.current.error).toBe("");
    expect(result.current.listening).toBe(true);
  });

  it("recovers when stop itself throws without leaving a live session", () => {
    const { result } = renderHook(() => useReviewDictation({ onTranscript: vi.fn() }));
    act(() => result.current.start());
    const recognition = currentRecognition();
    recognition.stop.mockImplementation(() => { throw new Error("Disconnected"); });
    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);
    expect(result.current.error).toContain("niet worden afgerond");
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
