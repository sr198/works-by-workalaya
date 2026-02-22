/**
 * REST client for Kokoro-FastAPI TTS.
 * All defaults (voice, model, speed, format) come from config.ts.
 */

import { config } from "./config.js";

export interface TtsOptions {
  voice?: string;
  speed?: number;
}

export async function synthesize(text: string, opts: TtsOptions = {}): Promise<Buffer> {
  const body = {
    model:           config.tts.model,
    input:           text,
    voice:           opts.voice ?? config.tts.voice,
    speed:           opts.speed ?? config.tts.speed,
    response_format: config.tts.format,
  };

  const res = await fetch(`${config.tts.baseUrl}/v1/audio/speech`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Kokoro TTS failed ${res.status}: ${msg}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
