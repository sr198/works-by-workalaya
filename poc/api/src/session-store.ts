/**
 * In-memory session store with 30-minute TTL.
 * Sessions are keyed by sessionId (UUID).
 */

import { BookingState } from "./state-machine.js";
import type { MatchedProvider } from "./provider-matcher.js";

export interface BookingContext {
  sessionId: string;
  state: BookingState;
  turnCount: number;
  booking: Partial<{
    service_type: string;
    date: string;
    time: string;
    duration_hours: number;
    location: string;
  }>;
  candidates: MatchedProvider[];       // providers shown to user
  selectedProviderId: string | null;
  confirmedBookingId: string | null;
  lastActivity: number;                // Date.now()
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const store = new Map<string, BookingContext>();

export function createSession(sessionId: string): BookingContext {
  const ctx: BookingContext = {
    sessionId,
    state: BookingState.IDLE,
    turnCount: 0,
    booking: {},
    candidates: [],
    selectedProviderId: null,
    confirmedBookingId: null,
    lastActivity: Date.now(),
  };
  store.set(sessionId, ctx);
  return ctx;
}

export function getSession(sessionId: string): BookingContext | undefined {
  const ctx = store.get(sessionId);
  if (!ctx) return undefined;

  // Expire stale sessions
  if (Date.now() - ctx.lastActivity > SESSION_TTL_MS) {
    store.delete(sessionId);
    return undefined;
  }

  ctx.lastActivity = Date.now();
  return ctx;
}

export function getOrCreateSession(sessionId: string): BookingContext {
  return getSession(sessionId) ?? createSession(sessionId);
}

export function updateSession(sessionId: string, updates: Partial<BookingContext>): void {
  const ctx = store.get(sessionId);
  if (ctx) {
    Object.assign(ctx, updates, { lastActivity: Date.now() });
  }
}

export function deleteSession(sessionId: string): void {
  store.delete(sessionId);
}

/** Periodic cleanup — call this every 5 minutes. */
export function pruneSessions(): void {
  const now = Date.now();
  for (const [id, ctx] of store.entries()) {
    if (now - ctx.lastActivity > SESSION_TTL_MS) {
      store.delete(id);
    }
  }
}
