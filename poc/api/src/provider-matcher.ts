/**
 * In-memory provider matching pipeline.
 *
 * Pipeline: filter(serviceType) → haversine(≤25km) → availabilityOverlap → sortBy(rating desc, distance asc) → top 3
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Provider {
  id: string;
  name: string;
  services: string[];
  lat: number;
  lng: number;
  ward: string;
  rating: number;
  availability: string[]; // ISO datetime strings e.g. "2026-02-24T14:00"
  hourly_rate: number;
}

export interface MatchedProvider extends Provider {
  distance_km: number;
  matched_slot: string; // the availability slot that matches
}

// Load once at startup
const DATA_PATH = join(__dirname, "../../data/providers.json");
let _providers: Provider[] | null = null;

function getProviders(): Provider[] {
  if (!_providers) {
    const raw = readFileSync(DATA_PATH, "utf-8");
    _providers = JSON.parse(raw) as Provider[];
  }
  return _providers;
}

/** Haversine distance between two lat/lng points in km. */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a provider has availability overlapping the requested window.
 * Returns the matching slot string or null.
 */
function findAvailableSlot(
  provider: Provider,
  date: string,
  requestedTime: string,
): string | null {
  // Parse requested start datetime
  const requestedStart = new Date(`${date}T${requestedTime}:00`);

  for (const slot of provider.availability) {
    const slotDate = new Date(`${slot}:00`);
    const slotDateStr = slotDate.toISOString().split("T")[0];

    if (slotDateStr !== date) continue;

    // Accept slots within ±2 hours of requested time
    const diffMs = Math.abs(slotDate.getTime() - requestedStart.getTime());
    if (diffMs <= 2 * 60 * 60 * 1000) {
      return slot;
    }
  }

  return null;
}

export interface MatchCriteria {
  serviceType: string;
  date: string;
  time: string;
  durationHours: number;
  /** Optional user lat/lng for distance calculation. Falls back to Nairobi CBD. */
  userLat?: number;
  userLng?: number;
}

const NAIROBI_CBD_LAT = -1.286389;
const NAIROBI_CBD_LNG = 36.817223;

export function matchProviders(criteria: MatchCriteria): MatchedProvider[] {
  const providers = getProviders();
  const userLat = criteria.userLat ?? NAIROBI_CBD_LAT;
  const userLng = criteria.userLng ?? NAIROBI_CBD_LNG;

  const results: MatchedProvider[] = [];

  for (const provider of providers) {
    // 1. Filter by service type
    if (!provider.services.includes(criteria.serviceType)) continue;

    // 2. Filter by distance ≤ 25km
    const distance = haversine(userLat, userLng, provider.lat, provider.lng);
    if (distance > 25) continue;

    // 3. Check availability overlap
    const slot = findAvailableSlot(provider, criteria.date, criteria.time);
    if (!slot) continue;

    results.push({ ...provider, distance_km: Math.round(distance * 10) / 10, matched_slot: slot });
  }

  // 4. Sort: rating desc, then distance asc
  results.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.distance_km - b.distance_km;
  });

  // 5. Top 3
  return results.slice(0, 3);
}
