/**
 * Entry point — HTTP server (REST) + WebSocket (same port).
 *
 * HTTP routes:
 *  GET /health    — liveness
 *  GET /bookings  — list all in-memory bookings
 *
 * WebSocket: ws://localhost:3001
 */

import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config.js";
import { listBookings } from "./bookings.js";
import { pruneSessions } from "./session-store.js";
import { handleMessage } from "./ws-handler.js";

const PORT = config.port;

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", ts: new Date().toISOString() }));
    return;
  }

  if (req.method === "GET" && req.url === "/bookings") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(listBookings(), null, 2));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

const wss = new WebSocketServer({ server: httpServer });

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

// Prune stale sessions every 5 minutes
setInterval(pruneSessions, 5 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`[API] listening on http://localhost:${PORT}`);
  console.log(`[API] WebSocket:  ws://localhost:${PORT}`);
  console.log(`[API] Bookings:   http://localhost:${PORT}/bookings`);
});
