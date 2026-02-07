/**
 * Tests for VoiceAssistant component.
 * Mocks the useVoiceAgent hook and browser Speech APIs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoiceAssistant } from "./VoiceAssistant";

/* ── Mock the useVoiceAgent hook ── */

const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockStopSpeaking = vi.fn();

const defaultHookState = {
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  startListening: mockStartListening,
  stopListening: mockStopListening,
  stopSpeaking: mockStopSpeaking,
};

let hookState = { ...defaultHookState };

vi.mock("@/hooks/useVoiceAgent", () => ({
  useVoiceAgent: (opts: Record<string, unknown>) => {
    // Store the callbacks for triggering in tests
    (globalThis as Record<string, unknown>).__voiceAgentOpts = opts;
    return hookState;
  },
}));

describe("VoiceAssistant", () => {
  beforeEach(() => {
    hookState = { ...defaultHookState };
    mockStartListening.mockClear();
    mockStopListening.mockClear();
    mockStopSpeaking.mockClear();
  });

  describe("rendering", () => {
    it("renders the assistant header", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      expect(screen.getByText("Assistent")).toBeInTheDocument();
    });

    it("shows microphone emoji", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      expect(screen.getByText("🎙️")).toBeInTheDocument();
    });

    it("starts collapsed", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      expect(screen.queryByText(/Druk om te spreken/)).not.toBeInTheDocument();
    });
  });

  describe("expanding and collapsing", () => {
    it("expands when header is clicked", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByText("Druk om te spreken")).toBeInTheDocument();
    });

    it("shows empty state hint when expanded", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByText(/Doelpunt Jens/)).toBeInTheDocument();
    });

    it("collapses when header is clicked again", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByText("Druk om te spreken")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.queryByText("Druk om te spreken")).not.toBeInTheDocument();
    });
  });

  describe("mic button", () => {
    it("calls startListening when clicked", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      fireEvent.click(screen.getByLabelText("Druk om te spreken"));
      expect(mockStartListening).toHaveBeenCalledOnce();
    });

    it("shows Luisteren... when listening", () => {
      hookState = { ...defaultHookState, isListening: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByText("Luisteren...")).toBeInTheDocument();
    });

    it("shows Bezig... when processing", () => {
      hookState = { ...defaultHookState, isProcessing: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByText("Bezig...")).toBeInTheDocument();
    });

    it("shows Spreekt... when speaking", () => {
      hookState = { ...defaultHookState, isSpeaking: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByText("Spreekt...")).toBeInTheDocument();
    });

    it("calls stopListening when clicked while listening", () => {
      hookState = { ...defaultHookState, isListening: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      fireEvent.click(screen.getByLabelText("Luisteren..."));
      expect(mockStopListening).toHaveBeenCalledOnce();
    });

    it("calls stopSpeaking when clicked while speaking", () => {
      hookState = { ...defaultHookState, isSpeaking: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      fireEvent.click(screen.getByLabelText("Spreekt..."));
      expect(mockStopSpeaking).toHaveBeenCalledOnce();
    });

    it("disables button when processing", () => {
      hookState = { ...defaultHookState, isProcessing: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      const btn = screen.getByLabelText("Bezig...");
      expect(btn).toBeDisabled();
    });
  });

  describe("busy indicator", () => {
    it("shows Actief badge when listening", () => {
      hookState = { ...defaultHookState, isListening: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      expect(screen.getByText("Actief")).toBeInTheDocument();
    });

    it("shows Actief badge when processing", () => {
      hookState = { ...defaultHookState, isProcessing: true };
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      expect(screen.getByText("Actief")).toBeInTheDocument();
    });

    it("no Actief badge when idle", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      expect(screen.queryByText("Actief")).not.toBeInTheDocument();
    });
  });

  describe("Dutch labels", () => {
    it("uses Dutch text for assistant header", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      expect(screen.getByText("Assistent")).toBeInTheDocument();
    });

    it("uses Dutch hint text", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByText(/Doelpunt Jens/)).toBeInTheDocument();
      expect(screen.getByText(/Wissel Tim/)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("mic button has aria-label", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      fireEvent.click(screen.getByText("Assistent"));
      expect(screen.getByLabelText("Druk om te spreken")).toBeInTheDocument();
    });

    it("header button has minimum touch target", () => {
      render(<VoiceAssistant matchId="m1" pin="1234" />);
      const header = screen.getByText("Assistent").closest("button");
      expect(header?.className).toContain("min-h-[48px]");
    });
  });
});
