/**
 * Loads prompts.json and exposes typed template helpers.
 *
 * Templates use {placeholder} syntax replaced via a simple interpolate() call.
 * The file is read once at startup; set PROMPTS_FILE to override the path.
 */

import { readFileSync } from "fs";
import { config } from "./config.js";

interface PromptsShape {
  extracting: string;
  clarifying_fallback: string;
  address_confirm: string;
  address_confirm_proceed: string;
  no_providers: string;
  provider_intro: string;
  provider_option: string;
  provider_outro: string;
  provider_not_found: string;
  provider_retry: string;
  provider_error: string;
  confirm_retry: string;
  confirming_fallback: string;
  confirming: string;
  booked: string;
  idle: string;
  barge_in: string;
  session_limit: string;
  already_booked: string;
  currency: string;
  locale: string;
}

function load(): PromptsShape {
  const raw = readFileSync(config.prompts.file, "utf-8");
  return JSON.parse(raw) as PromptsShape;
}

const _p: PromptsShape = load();

/** Simple {key} → value interpolation. */
function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k as keyof typeof vars]) : `{${k}}`,
  );
}

export const prompts = {
  extracting: () => _p.extracting,
  clarifyingFallback: () => _p.clarifying_fallback,
  addressConfirm: (address: string) => t(_p.address_confirm, { address }),
  addressConfirmProceed: (address: string) => t(_p.address_confirm_proceed, { address }),
  bargeIn: () => _p.barge_in,
  sessionLimit: () => _p.session_limit,
  alreadyBooked: () => _p.already_booked,
  idle: () => _p.idle,
  providerNotFound: () => _p.provider_not_found,
  providerRetry: () => _p.provider_retry,
  providerError: () => _p.provider_error,
  confirmRetry: () => _p.confirm_retry,

  noProviders: () => _p.no_providers,

  providerSelection: (providers: Array<{ name: string; rating: number; distance_km: number; matched_slot: string; hourly_rate: number }>) => {
    const options = providers.map((p, i) =>
      t(_p.provider_option, {
        index:    i + 1,
        name:     p.name,
        rating:   p.rating,
        distance: p.distance_km,
        time:     formatSlot(p.matched_slot),
        rate:     formatAmount(p.hourly_rate, _p.currency),
      }),
    );
    const intro = t(_p.provider_intro, { count: providers.length });
    return `${intro} ${options.join(" ")} ${_p.provider_outro}`;
  },

  confirming: (vars: {
    providerName: string;
    service: string;
    location: string;
    date: string;
    time: string;
    duration: number;
    total: number;
  }) =>
    t(_p.confirming, {
      ...vars,
      total: formatAmount(vars.total, _p.currency),
    }),

  booked: (bookingId: string) => t(_p.booked, { bookingId }),

  currency: () => _p.currency,
  locale: () => _p.locale,
};

// ── Formatting helpers (locale-aware via prompts.json) ───────────────────────

function formatSlot(isoSlot: string): string {
  const parts = isoSlot.split("T");
  if (parts.length < 2) return isoSlot;
  const [hStr, mStr] = (parts[1] ?? "").split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}
