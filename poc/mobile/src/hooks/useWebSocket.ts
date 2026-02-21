/**
 * WebSocket connection to the Node.js API.
 *
 * Android: use `adb reverse tcp:3001 tcp:3001` so ws://localhost:3001 works from device.
 * Alternatively set WS_URL env var to your LAN IP: ws://192.168.x.x:3001
 */
import { useEffect, useRef, useCallback, useState } from "react";

const WS_URL = process.env["EXPO_PUBLIC_WS_URL"] ?? "ws://localhost:3001";

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

export interface StateUpdateMessage {
  type: "STATE_UPDATE";
  state: string;
  prompt: string;
  providers?: ProviderSummary[];
  booking?: Record<string, unknown>;
}

export interface ProviderSummary {
  id: string;
  name: string;
  rating: number;
  distance_km: number;
  matched_slot: string;
  hourly_rate: number;
  ward: string;
}

export interface ErrorMessage {
  type: "ERROR";
  message: string;
}

export type ServerMessage = StateUpdateMessage | ErrorMessage;

export interface UseWebSocketReturn {
  wsStatus: WsStatus;
  sendTranscript: (sessionId: string, text: string) => void;
  sendBargeIn: (sessionId: string) => void;
  onAudio: (cb: (data: ArrayBuffer) => void) => void;
  onMessage: (cb: (msg: ServerMessage) => void) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");

  const audioCallbackRef = useRef<((data: ArrayBuffer) => void) | null>(null);
  const messageCallbackRef = useRef<((msg: ServerMessage) => void) | null>(null);

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      console.log("[WS] connected");
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        // Binary audio frame
        if (event.data instanceof Blob) {
          event.data.arrayBuffer().then((buf) => audioCallbackRef.current?.(buf));
        } else {
          audioCallbackRef.current?.(event.data);
        }
        return;
      }

      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        messageCallbackRef.current?.(msg);
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => setWsStatus("error");

    ws.onclose = () => {
      setWsStatus("disconnected");
      // Reconnect after 2 seconds
      reconnectTimerRef.current = setTimeout(connect, 2000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendTranscript = useCallback((sessionId: string, text: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "TRANSCRIPT", sessionId, text }),
    );
  }, []);

  const sendBargeIn = useCallback((sessionId: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "BARGE_IN", sessionId }),
    );
  }, []);

  const onAudio = useCallback((cb: (data: ArrayBuffer) => void) => {
    audioCallbackRef.current = cb;
  }, []);

  const onMessage = useCallback((cb: (msg: ServerMessage) => void) => {
    messageCallbackRef.current = cb;
  }, []);

  return { wsStatus, sendTranscript, sendBargeIn, onAudio, onMessage };
}
