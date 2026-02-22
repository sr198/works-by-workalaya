/**
 * Orchestrates the complete voice booking flow.
 * Wires whisper → WebSocket → TTS player → state updates.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket, type ProviderSummary } from "./useWebSocket";
import { useTtsPlayer } from "./useTtsPlayer";

const SESSION_ID = `session_${Date.now()}`;
const MAX_TURNS = 8;

export type BookingFlowState =
  | "IDLE"
  | "EXTRACTING"
  | "CLARIFYING"
  | "ADDRESS_CONFIRM"
  | "PROVIDER_SELECTION"
  | "CONFIRMING"
  | "BOOKED";

export interface BookingFlowReturn {
  bookingState: BookingFlowState;
  currentPrompt: string;
  providers: ProviderSummary[];
  booking: Record<string, unknown> | null;
  turnCount: number;
  wsStatus: string;
  sendTranscript: (text: string) => void;
  handleBargeIn: () => void;
  playAudio: (data: ArrayBuffer) => Promise<void>;
  stopAudio: () => Promise<void>;
  isAudioPlaying: () => boolean;
}

export function useBookingFlow(): BookingFlowReturn {
  const [bookingState, setBookingState] = useState<BookingFlowState>("IDLE");
  const [currentPrompt, setCurrentPrompt] = useState("Tap the mic to start booking a cleaner.");
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  const { wsStatus, sendTranscript: wsSendTranscript, sendBargeIn, onAudio, onMessage } =
    useWebSocket();
  const { playAudio, stopAudio, isPlaying } = useTtsPlayer();

  // Register audio callback
  useEffect(() => {
    onAudio(async (data) => {
      await playAudio(data);
    });
  }, [onAudio, playAudio]);

  // Register message callback
  useEffect(() => {
    onMessage((msg) => {
      if (msg.type === "STATE_UPDATE") {
        setBookingState(msg.state as BookingFlowState);
        setCurrentPrompt(msg.prompt);
        if (msg.providers) setProviders(msg.providers);
        if (msg.booking) setBooking(msg.booking as Record<string, unknown>);
      }
    });
  }, [onMessage]);

  const sendTranscript = useCallback(
    (text: string) => {
      if (turnCount >= MAX_TURNS) return;
      setTurnCount((n) => n + 1);
      wsSendTranscript(SESSION_ID, text);
    },
    [turnCount, wsSendTranscript],
  );

  const handleBargeIn = useCallback(() => {
    stopAudio();
    sendBargeIn(SESSION_ID);
  }, [stopAudio, sendBargeIn]);

  return {
    bookingState,
    currentPrompt,
    providers,
    booking,
    turnCount,
    wsStatus,
    sendTranscript,
    handleBargeIn,
    playAudio,
    stopAudio,
    isAudioPlaying: isPlaying,
  };
}
