/**
 * Pure WebSocket message handling — no WSS creation.
 * Imported by both ws-server.ts (standalone) and main.ts (HTTP+WS).
 */

import { WebSocket } from "ws";
import { BookingState, transition } from "./state-machine.js";
import { getOrCreateSession, updateSession } from "./session-store.js";
import { matchProviders, type MatchedProvider } from "./provider-matcher.js";
import { extractBooking, selectProvider } from "./ai-client.js";
import { synthesize } from "./tts-client.js";
import { buildPrompt } from "./response-builder.js";
import { createBooking } from "./bookings.js";
import { prompts } from "./prompts.js";

const MAX_TURNS = 8;

export async function handleMessage(
  ws: WebSocket,
  sessionId: string,
  msg: { type: string; sessionId?: string; text?: string },
): Promise<void> {
  if (msg.type === "BARGE_IN") {
    await handleBargeIn(ws, sessionId);
    return;
  }

  if (msg.type === "TRANSCRIPT" && msg.text) {
    await handleTranscript(ws, sessionId, msg.text);
  }
}

async function handleBargeIn(ws: WebSocket, sessionId: string): Promise<void> {
  const ctx = getOrCreateSession(sessionId);
  const newState =
    ctx.state === BookingState.CONFIRMING
      ? BookingState.PROVIDER_SELECTION
      : ctx.state;

  updateSession(sessionId, { state: newState });

  send(ws, {
    type: "STATE_UPDATE",
    state: newState,
    prompt: prompts.bargeIn(),
  });
}

async function handleTranscript(
  ws: WebSocket,
  sessionId: string,
  text: string,
): Promise<void> {
  const ctx = getOrCreateSession(sessionId);

  if (ctx.turnCount >= MAX_TURNS) {
    await sendAndSpeak(ws, BookingState.IDLE, prompts.sessionLimit(), {});
    return;
  }

  updateSession(sessionId, { turnCount: ctx.turnCount + 1 });

  try {
    switch (ctx.state) {
      case BookingState.IDLE:
      case BookingState.EXTRACTING:
      case BookingState.CLARIFYING:
        await handleExtraction(ws, sessionId, text);
        break;

      case BookingState.PROVIDER_SELECTION:
        await handleProviderSelection(ws, sessionId, text);
        break;

      case BookingState.CONFIRMING:
        await handleConfirmation(ws, sessionId, text);
        break;

      case BookingState.BOOKED:
        await sendAndSpeak(ws, BookingState.BOOKED, prompts.alreadyBooked(), {});
        break;
    }
  } catch (err) {
    console.error("[WS] handler error:", err);
    send(ws, { type: "ERROR", message: String(err) });
  }
}

async function handleExtraction(
  ws: WebSocket,
  sessionId: string,
  text: string,
): Promise<void> {
  const ctx = getOrCreateSession(sessionId);

  updateSession(sessionId, { state: BookingState.EXTRACTING });

  const result = await extractBooking(text, ctx.booking as Record<string, unknown>);

  const mergedBooking = { ...ctx.booking, ...result.booking };
  const cleanBooking = Object.fromEntries(
    Object.entries(mergedBooking).filter(([, v]) => v != null),
  );

  const newState = transition(BookingState.EXTRACTING, {
    type: "EXTRACTION_DONE",
    missingFields: result.missing_fields,
  });

  updateSession(sessionId, { state: newState, booking: cleanBooking });

  if (newState === BookingState.CLARIFYING) {
    await sendAndSpeak(
      ws,
      newState,
      result.clarification_prompt ?? buildPrompt(newState),
      { booking: cleanBooking },
    );
    return;
  }

  await runProviderSelection(ws, sessionId, cleanBooking);
}

async function runProviderSelection(
  ws: WebSocket,
  sessionId: string,
  booking: Record<string, unknown>,
): Promise<void> {
  const candidates = matchProviders({
    serviceType: String(booking["service_type"] ?? "standard"),
    date: String(booking["date"] ?? ""),
    time: String(booking["time"] ?? "09:00"),
    durationHours: Number(booking["duration_hours"] ?? 2),
  });

  updateSession(sessionId, {
    state: BookingState.PROVIDER_SELECTION,
    candidates,
    booking: booking as never,
  });

  const prompt = buildPrompt(BookingState.PROVIDER_SELECTION, { providers: candidates });
  await sendAndSpeak(ws, BookingState.PROVIDER_SELECTION, prompt, {
    providers: candidates,
    booking,
  });
}

async function handleProviderSelection(
  ws: WebSocket,
  sessionId: string,
  text: string,
): Promise<void> {
  const ctx = getOrCreateSession(sessionId);
  const miniProviders = ctx.candidates.map((p) => ({ id: p.id, name: p.name }));
  const result = await selectProvider(text, miniProviders);

  if (!result.provider_id) {
    await sendAndSpeak(
      ws,
      BookingState.PROVIDER_SELECTION,
      prompts.providerRetry() + " " + buildPrompt(BookingState.PROVIDER_SELECTION, { providers: ctx.candidates }),
      { providers: ctx.candidates },
    );
    return;
  }

  const selectedProvider = ctx.candidates.find((p) => p.id === result.provider_id);
  if (!selectedProvider) {
    await sendAndSpeak(
      ws,
      BookingState.PROVIDER_SELECTION,
      prompts.providerNotFound(),
      { providers: ctx.candidates },
    );
    return;
  }

  updateSession(sessionId, {
    state: BookingState.CONFIRMING,
    selectedProviderId: result.provider_id,
  });

  const prompt = buildPrompt(BookingState.CONFIRMING, {
    selectedProvider,
    booking: ctx.booking as Record<string, unknown>,
  });
  await sendAndSpeak(ws, BookingState.CONFIRMING, prompt, { booking: ctx.booking });
}

async function handleConfirmation(
  ws: WebSocket,
  sessionId: string,
  text: string,
): Promise<void> {
  const ctx = getOrCreateSession(sessionId);
  const selectedProvider = ctx.candidates.find((p) => p.id === ctx.selectedProviderId);

  if (!selectedProvider) {
    updateSession(sessionId, { state: BookingState.PROVIDER_SELECTION });
    await sendAndSpeak(ws, BookingState.PROVIDER_SELECTION, prompts.providerError(), { providers: ctx.candidates });
    return;
  }

  const result = await selectProvider(
    text,
    [{ id: selectedProvider.id, name: selectedProvider.name }],
    true,
  );

  if (!result.confirmed) {
    await sendAndSpeak(ws, BookingState.CONFIRMING, prompts.confirmRetry(), {});
    return;
  }

  const b = ctx.booking as Record<string, unknown>;
  const booking = createBooking({
    sessionId,
    providerId: selectedProvider.id,
    providerName: selectedProvider.name,
    serviceType: String(b["service_type"] ?? "standard"),
    date: String(b["date"] ?? ""),
    time: String(b["time"] ?? ""),
    durationHours: Number(b["duration_hours"] ?? 2),
    location: String(b["location"] ?? ""),
    hourlyRate: selectedProvider.hourly_rate,
    totalEstimate: selectedProvider.hourly_rate * Number(b["duration_hours"] ?? 2),
  });

  updateSession(sessionId, {
    state: BookingState.BOOKED,
    confirmedBookingId: booking.id,
  });

  const prompt = buildPrompt(BookingState.BOOKED, { bookingId: booking.id });
  await sendAndSpeak(ws, BookingState.BOOKED, prompt, { booking });
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

async function sendAndSpeak(
  ws: WebSocket,
  state: BookingState,
  prompt: string,
  extra: Record<string, unknown>,
): Promise<void> {
  send(ws, { type: "STATE_UPDATE", state, prompt, ...extra });

  try {
    const audio = await synthesize(prompt);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(audio);
    }
  } catch (err) {
    console.error("[TTS] synthesis failed (non-fatal):", err);
  }
}
