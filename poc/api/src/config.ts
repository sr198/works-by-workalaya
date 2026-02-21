/**
 * Single source of truth for all runtime configuration.
 * All values are read from environment variables with safe defaults.
 *
 * Copy poc/api/.env.example → poc/api/.env and override as needed.
 */

function str(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function num(key: string, fallback: number): number {
  const v = process.env[key];
  return v !== undefined ? parseFloat(v) : fallback;
}

export const config = {
  port: Math.trunc(num("PORT", 3001)),

  ai: {
    baseUrl: str("AI_BASE_URL", "http://localhost:8000"),
  },

  tts: {
    baseUrl:  str("KOKORO_BASE_URL", "http://localhost:8880"),
    model:    str("KOKORO_MODEL",    "kokoro"),
    voice:    str("KOKORO_VOICE",    "af_heart"),
    speed:    num("KOKORO_SPEED",    1.0),
    format:   str("KOKORO_FORMAT",   "mp3"),
  },

  prompts: {
    /** Path to the JSON prompts file. Defaults to prompts.json next to this file. */
    file: str("PROMPTS_FILE", new URL("../../prompts.json", import.meta.url).pathname),
  },
} as const;
