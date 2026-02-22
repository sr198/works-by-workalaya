/**
 * Craft TTS scripts per booking state transition.
 * All strings come from prompts.json via prompts.ts — nothing hardcoded here.
 */

import { BookingState } from "./state-machine.js";
import type { MatchedProvider } from "./provider-matcher.js";
import { prompts } from "./prompts.js";

export function buildPrompt(
  state: BookingState,
  opts: {
    clarification?: string;
    providers?: MatchedProvider[];
    selectedProvider?: MatchedProvider;
    booking?: Record<string, unknown>;
    bookingId?: string;
  } = {},
): string {
  switch (state) {
    case BookingState.EXTRACTING:
      return prompts.extracting();

    case BookingState.CLARIFYING:
      return opts.clarification ?? prompts.clarifyingFallback();

    case BookingState.PROVIDER_SELECTION: {
      if (!opts.providers || opts.providers.length === 0) {
        return prompts.noProviders();
      }
      return prompts.providerSelection(opts.providers);
    }

    case BookingState.CONFIRMING: {
      const p = opts.selectedProvider;
      const b = opts.booking ?? {};
      if (!p) return prompts.confirming({
        providerName: "your cleaner",
        service: "",
        location: String(b["location"] ?? "your address"),
        date: "",
        time: "",
        duration: Number(b["duration_hours"] ?? 0),
        total: 0,
      });
      return prompts.confirming({
        providerName: p.name,
        service:      formatService(String(b["service_type"] ?? "")),
        location:     String(b["location"] ?? "your address"),
        date:         formatDate(String(b["date"] ?? ""), prompts.locale()),
        time:         String(b["time"] ?? ""),
        duration:     Number(b["duration_hours"] ?? 1),
        total:        p.hourly_rate * Number(b["duration_hours"] ?? 1),
      });
    }

    case BookingState.BOOKED:
      return prompts.booked(opts.bookingId ?? "");

    default:
      return prompts.idle();
  }
}

function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return "the requested date";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
}

function formatService(service: string): string {
  const map: Record<string, string> = {
    standard:    "standard clean",
    deep:        "deep clean",
    move_in_out: "move-in move-out clean",
  };
  return map[service] ?? service;
}
