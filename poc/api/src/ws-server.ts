/**
 * Standalone WebSocket server (for testing without HTTP layer).
 * Use `npx tsx src/ws-server.ts` to start in isolation.
 *
 * In production, use main.ts which shares the HTTP server port.
 */

import { WebSocketServer, WebSocket } from "ws";
import { handleMessage } from "./ws-handler.js";
import { pruneSessions } from "./session-store.js";

const PORT = parseInt(process.env["WS_PORT"] ?? "3001", 10);

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws: WebSocket) => {
  console.log("[WS] client connected");

  ws.on("message", async (raw) => {
    let msg: { type: string; sessionId?: string; text?: string };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const sessionId = msg.sessionId ?? "default";
    await handleMessage(ws, sessionId, msg);
  });

  ws.on("close", () => console.log("[WS] client disconnected"));
  ws.on("error", (e) => console.error("[WS] error", e));
});

setInterval(pruneSessions, 5 * 60 * 1000);

console.log(`[WS] standalone server on ws://localhost:${PORT}`);
