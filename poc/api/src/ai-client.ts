/**
 * REST client for the Python AI service.
 * Base URL comes from config.ts (AI_BASE_URL env var).
 */

import { config } from "./config.js";

const AI_BASE = config.ai.baseUrl;

export interface ExtractionResult {
  booking: {
    service_type?: string;
    date?: string;
    time?: string;
    duration_hours?: number;
    location?: string;
  };
  missing_fields: string[];
  clarification_prompt?: string;
}

export interface SelectionResult {
  provider_id: string | null;
  confirmed: boolean;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI service ${path} failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function extractBooking(
  transcript: string,
  existingBooking?: Record<string, unknown>,
): Promise<ExtractionResult> {
  return post<ExtractionResult>("/extract", {
    transcript,
    existing_booking: existingBooking ?? null,
  });
}

export async function selectProvider(
  transcript: string,
  providers: Array<{ id: string; name: string }>,
  awaitingConfirmation = false,
): Promise<SelectionResult> {
  return post<SelectionResult>("/select", {
    transcript,
    providers,
    awaiting_confirmation: awaitingConfirmation,
  });
}
