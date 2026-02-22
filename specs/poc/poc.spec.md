# Voice-first cleaning booking POC: a working technical plan

**Instructor + whisper.rn + Kokoro-FastAPI on a four-service local stack delivers a voice booking flow in ≤6 turns with sub-2-second round trips.** Every choice below is the single option that gets you to a working demo fastest, with the fewest moving parts and no cloud dependencies. The stack runs entirely on a local machine with one GPU: vLLM serves Qwen for extraction, Kokoro handles TTS, whisper.rn runs STT on-device, and Node.js orchestrates everything through a simple enum+switch state machine with in-memory session state.

---

## Service topology and how everything connects

Four backend services plus the mobile app. Nothing else.

```
┌─────────────────────────────────────────────────────────────┐
│                     📱 React Native App                      │
│  whisper.rn (on-device STT + VAD)  │  expo-av (TTS playback)│
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket (text up, audio+state down)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              🟢 Node.js API  :3001                           │
│  State Machine (enum+switch)  │  Provider Matcher (in-mem)  │
│  Session Store (Map)          │  WebSocket server            │
└──────┬────────────────────────────────┬─────────────────────┘
       │ REST POST                      │ REST POST
       │ (transcript + context)         │ (text → audio)
       ▼                                ▼
┌──────────────────┐          ┌─────────────────────────┐
│ 🐍 Python AI     │          │ 🔊 Kokoro-FastAPI :8880  │
│   Service :8000  │          │    (TTS, ~2GB VRAM)      │
│   Instructor +   │          │    Docker one-liner       │
│   Pydantic       │          └─────────────────────────┘
└────────┬─────────┘
         │ REST POST /v1/chat/completions
         ▼
┌──────────────────────────┐
│ 🤖 vLLM  :8080           │
│   Qwen 4-bit GPTQ        │
│   Structured JSON output  │
│   (~6-10GB VRAM)          │
└──────────────────────────┘
```

| Connection | Protocol | Why |
|---|---|---|
| App ↔ Node.js | **WebSocket** | Persistent bidirectional channel. Text transcripts flow up; TTS audio chunks and state updates flow down. Eliminates per-request overhead for voice latency. |
| Node.js → Python AI | **REST** | Request/response. Latency is dominated by LLM inference (~500–1000ms), not transport. REST is trivially debuggable with curl. |
| Python AI → vLLM | **REST** | vLLM's OpenAI-compatible `/v1/chat/completions` endpoint. Standard, well-tested. |
| Node.js → Kokoro | **REST** | POST text, receive chunked audio. Kokoro-FastAPI is OpenAI-compatible (`/v1/audio/speech`). |

**Session state** lives in an **in-memory `Map<string, BookingContext>`** on Node.js with a 30-minute TTL cleanup interval. No Redis, no database. A POC with a handful of concurrent sessions doesn't need persistence across restarts.

---

## LLM extraction: Instructor beats PydanticAI for this job

**Use Instructor with `Mode.JSON`**, not PydanticAI. Instructor is purpose-built for structured extraction from LLMs. PydanticAI is an agent framework — more machinery than you need for pulling five fields out of a transcript.

Three concrete reasons Instructor wins here. First, its default `Mode.JSON` sets `response_format={"type": "json_object"}` and injects the schema into the prompt — **far more reliable with quantized local models** than PydanticAI's default tool-calling approach, which requires vLLM's `--enable-auto-tool-choice` flag and breaks on nested Pydantic schemas (vLLM issue #15035). Second, Instructor's `Partial[T]` streaming gives you incremental field population across turns — exactly what a multi-turn voice booking needs. Third, automatic retries with validation feedback (`max_retries=2`) catch the occasional malformed output from a 4-bit model.

The gotcha to know: **vLLM's `$defs` handling is broken for tool-calling mode** with nested schemas. Instructor's JSON mode sidesteps this entirely because it serializes the schema into the prompt rather than passing it as a tool definition. Keep your `CleaningBooking` model flat — no nested sub-models with `$defs`.

```python
import instructor
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class ServiceType(str, Enum):
    STANDARD = "standard"
    DEEP = "deep"
    MOVE_IN_OUT = "move_in_out"

class CleaningBooking(BaseModel):
    service_type: Optional[ServiceType] = None
    date: Optional[str] = Field(None, description="YYYY-MM-DD")
    time: Optional[str] = Field(None, description="HH:MM 24h")
    duration_hours: Optional[float] = None
    location: Optional[str] = None

client = instructor.from_openai(
    OpenAI(base_url="http://localhost:8080/v1", api_key="token"),
    mode=instructor.Mode.JSON,
)

def extract_booking(transcript: str, existing: CleaningBooking | None = None) -> CleaningBooking:
    context = ""
    if existing:
        known = existing.model_dump(exclude_none=True)
        if known:
            context = f"\nAlready known: {known}. Update with new info only."

    return client.chat.completions.create(
        model="Qwen2.5-7B-Instruct-GPTQ-Int4",
        response_model=CleaningBooking,
        max_retries=2,
        temperature=0.1,
        messages=[
            {"role": "system", "content": f"Extract cleaning booking details. Null for missing fields. Today is 2026-02-21.{context}"},
            {"role": "user", "content": f'Transcript: "{transcript}"'},
        ],
    )
```

Launch vLLM without tool-calling flags — JSON mode doesn't need them:

```bash
vllm serve Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4 \
  --port 8080 --api-key token --quantization gptq \
  --max-model-len 4096 --dtype half
```

---

## On-device STT with whisper.rn is ready for POC use

**Use `whisper.rn`** (npm: `whisper.rn`, GitHub: mybigday/whisper.rn). It is mature enough: **736 stars, 354 commits, v0.5.2 released recently**, tested on iPhone 13 Pro Max and Pixel 6, supports Expo with prebuild. It wraps whisper.cpp with a native React Native bridge and includes a `RealtimeTranscriber` API with built-in Voice Activity Detection.

The key advantage over a server-side faster-whisper setup: **zero infrastructure**. No Python STT server, no WebSocket audio streaming, no audio format negotiation. The app transcribes on-device and sends text — not audio — to the backend. This eliminates an entire service from your topology.

Use the **`ggml-base.en.bin` model** (~142MB). It delivers good accuracy for the constrained vocabulary of a booking domain (dates, times, addresses, cleaning terms) while running at acceptable speed on modern phones. Enable Core ML on iOS for a meaningful speedup. Set `language: 'en'` to skip language detection overhead.

```javascript
import { initWhisper, initWhisperVad } from 'whisper.rn'
import { RealtimeTranscriber, AudioPcmStreamAdapter } from 'whisper.rn/realtime-transcription'

const whisperContext = await initWhisper({ filePath: 'ggml-base.en.bin' })
const vadContext = await initWhisperVad()
const audioStream = new AudioPcmStreamAdapter(/* config */)

const transcriber = new RealtimeTranscriber(
  { whisperContext, vadContext, audioStream, fs: RNFS },
  { audioSliceSec: 25, language: 'en', autoSliceOnSpeechEnd: true },
  {
    onTranscribe: (event) => sendToBackend(event.data?.result),
    onVad: (event) => {
      if (event.type === 'speech_start') stopTtsPlayback()  // barge-in
    },
  }
)
```

**Upgrade path**: if on-device accuracy falls short, swap to a local **faster-whisper WebSocket server** (using the `whisper_streaming_web` FastAPI project). The change is isolated: the app streams PCM audio instead of text, and you add one more Docker container. The rest of the architecture stays identical.

---

## Kokoro-FastAPI: near-ElevenLabs quality from a Docker one-liner

**Use Kokoro-TTS served via Kokoro-FastAPI.** It ranked **#1 on the HuggingFace TTS Arena** despite having only 82M parameters — beating models 5–15× its size. Voice quality is described as "close to ElevenLabs" in blind tests. It's Apache 2.0 licensed.

The killer feature for this POC: **Kokoro-FastAPI is a pre-built Docker image with an OpenAI-compatible API**. One command gets you a streaming TTS service:

```bash
docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest
# Or CPU-only (still 5-10× realtime, frees GPU for vLLM):
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

Resource footprint is **~2–3GB VRAM** on GPU, leaving plenty of room alongside vLLM's Qwen model. Time to first byte is **~300ms on a 4060 Ti, ~80ms on a 4090**. It supports chunked streaming over HTTP in PCM, MP3, WAV, and Opus formats.

Piper TTS is the fallback if you have no GPU headroom at all — it runs on CPU and is fast, but sounds noticeably more robotic. **Coqui XTTS is dead**: the company shut down in 2024, the model is under a restrictive license, and installation is a known pain point. Skip it entirely.

Node.js calls Kokoro identically to how you'd call OpenAI's TTS:

```javascript
const ttsResponse = await fetch('http://localhost:8880/v1/audio/speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'kokoro', voice: 'af_bella',
    input: 'Your deep clean is booked for Tuesday at 2 PM.',
    response_format: 'mp3',
  }),
})
const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
// Send to app via WebSocket binary frame
ws.send(audioBuffer)
```

---

## React Native audio stack: whisper.rn + expo-av with energy-threshold barge-in

The audio stack has two concerns: **mic capture + STT** (handled by whisper.rn, as above) and **TTS playback with interrupt support** (handled by expo-av).

**Do not use** `react-native-audio-record` (abandoned 6 years ago), `expo-speech`/`react-native-tts` (text-based platform TTS, not audio playback), or `react-native-live-audio-stream` (unmaintained). The `react-native-audio-api` from Software Mansion is promising but lacks AudioWorkletNode — not ready.

**For TTS playback, use `expo-av`'s `Audio.Sound`**. It can load audio from a base64 data URI or a local temp file written from the WebSocket binary payload. Crucially, `Sound.stopAsync()` provides instant interruption for barge-in:

```javascript
import { Audio } from 'expo-av'

const sound = new Audio.Sound()

async function playTtsAudio(audioBuffer: ArrayBuffer) {
  const base64 = Buffer.from(audioBuffer).toString('base64')
  const uri = `data:audio/mp3;base64,${base64}`
  await sound.loadAsync({ uri })
  await sound.playAsync()
}

function stopTtsPlayback() {
  sound.stopAsync()  // instant interrupt for barge-in
  sound.unloadAsync()
}
```

**Barge-in flow**: whisper.rn's VAD fires `onVad({ type: 'speech_start' })` → call `stopTtsPlayback()` → send interrupt signal to backend via WebSocket → begin forwarding new transcript. Set the iOS audio session to `.playAndRecord` mode for simultaneous mic and speaker. For the POC, this works well enough with headphones; for speaker mode, you'll want to upgrade to `@speechmatics/expo-two-way-audio` (which has hardware AEC) for production.

**VAD**: Start with **energy-threshold detection** using the volume levels from whisper.rn's VAD callbacks. This is zero-dependency and sufficient for a demo. For production, `react-native-vad` (DaVoice) provides ML-based VAD on-device.

---

## State machine: six states, zero libraries

**Simple enum+switch in Node.js.** XState is a powerful statechart library, but for a linear 6-state flow it adds learning curve, boilerplate, and a dependency with no proportional benefit. You can always migrate to XState if the flow grows to 15+ states with parallel regions.

The state machine handles transitions and determines what to do next. The Python AI service stays stateless — it receives text, returns structured JSON. Business logic belongs in the orchestrator.

```typescript
enum BookingState {
  IDLE, EXTRACTING, CLARIFYING, PROVIDER_SELECTION, CONFIRMING, BOOKED
}

interface BookingContext {
  state: BookingState
  extracted: Partial<CleaningBooking>
  missingFields: string[]
  providers: Provider[]
  selectedProvider?: Provider
  history: { role: string; content: string }[]
}

function transition(ctx: BookingContext, event: BookingEvent): BookingContext {
  switch (ctx.state) {
    case BookingState.IDLE:
      if (event.type === 'USER_MESSAGE')
        return { ...ctx, state: BookingState.EXTRACTING }
      break
    case BookingState.EXTRACTING:
      if (event.type === 'EXTRACTION_DONE') {
        if (event.missing.length > 0)
          return { ...ctx, state: BookingState.CLARIFYING,
                   extracted: { ...ctx.extracted, ...event.data },
                   missingFields: event.missing }
        return { ...ctx, state: BookingState.PROVIDER_SELECTION,
                 extracted: { ...ctx.extracted, ...event.data } }
      }
      break
    case BookingState.CLARIFYING:
      if (event.type === 'EXTRACTION_DONE' && event.missing.length === 0)
        return { ...ctx, state: BookingState.PROVIDER_SELECTION,
                 extracted: { ...ctx.extracted, ...event.data } }
      break
    case BookingState.PROVIDER_SELECTION:
      if (event.type === 'PROVIDER_SELECTED')
        return { ...ctx, state: BookingState.CONFIRMING,
                 selectedProvider: event.provider }
      break
    case BookingState.CONFIRMING:
      if (event.type === 'CONFIRMED')
        return { ...ctx, state: BookingState.BOOKED }
      break
  }
  return ctx
}
```

---

## Provider matching: 30 records, pure arithmetic, zero databases

**In-memory filtering is not just sufficient — it's optimal.** Iterating 30 objects with filter/map/sort completes in microseconds. pgvector is designed for millions of vectors; AWS documentation notes sequential scans beat index scans below 10K records. Adding embeddings for service-description matching at this scale means standing up Postgres, running an embedding model, and building a vector pipeline to gain nothing measurable over a **3-line synonym map** plus LLM normalization during extraction.

The algorithm: `filter(serviceType) → haversine(distance ≤ 25km) → availability overlap → sort(rating desc, distance asc)`. Load providers from a JSON file at startup. The Haversine formula is 8 lines of TypeScript — no library needed.

---

## Data flow walkthrough: one complete booking session

**Turn 1 — User initiates** (~1.5s round trip)

> User says: *"I need a deep clean next Tuesday around 2pm"*

1. whisper.rn transcribes on-device → `"I need a deep clean next Tuesday around 2pm"` (~500ms)
2. Text sent via WebSocket to Node.js
3. State machine: `IDLE → EXTRACTING`
4. Node.js POST to Python AI → Instructor extracts via vLLM (~800ms):
   `{ service_type: "deep", date: "2026-02-24", time: "14:00", duration_hours: null, location: null }`
5. Missing: `[duration_hours, location]` → State: `EXTRACTING → CLARIFYING`
6. Node.js generates response → POST to Kokoro-FastAPI → audio (~300ms)
7. Audio sent to app via WebSocket → expo-av plays: *"Deep clean next Tuesday at 2 — got it. How long do you need, and what's the address?"*

**Turn 2 — User provides remaining details** (~1.5s)

> *"About 3 hours. I'm at 742 Evergreen Terrace."*

1. whisper.rn transcribes → text to Node.js
2. Python AI merges with existing data: `duration_hours: 3.0, location: "742 Evergreen Terrace"`
3. All fields complete → State: `CLARIFYING → PROVIDER_SELECTION`
4. In-memory provider match runs (<1ms): 30 → filter deep_clean → 18 → haversine ≤25km → 7 → Tuesday 2pm available → 3 → sort by rating
5. TTS: *"I found 3 cleaners. Maria's Cleaning, 4.9 stars, 2 miles away. Want to go with Maria's?"*

**Turn 3 — User selects** (~1.2s)

> *"Yes, Maria's."*

1. State: `PROVIDER_SELECTION → CONFIRMING`
2. TTS: *"Booking Maria's Cleaning for a deep clean at 742 Evergreen Terrace, Tuesday Feb 24 at 2 PM, 3 hours, $180. Shall I confirm?"*

**Turn 4 — User confirms** (~1.0s)

> *"Confirm."*

1. State: `CONFIRMING → BOOKED`. Booking saved in-memory.
2. TTS: *"Done! Maria's Cleaning is booked. You'll get a confirmation shortly."*

**4 turns. Under 6 seconds of total backend processing.** Well within the ≤6 turn target.

---

## Conclusion: what to build on Monday morning

The entire backend fits in a `docker-compose.yml` with three containers (vLLM, Kokoro-FastAPI, Python AI service) plus a Node.js process. The monorepo structure is `packages/mobile` (React Native + whisper.rn), `packages/api` (Node.js orchestrator), and `packages/ai` (Python Instructor service).

The non-obvious insight from this research: **the weakest link is not the LLM or the audio pipeline — it's the audio library ecosystem in React Native.** Duplex audio with echo cancellation remains a gap in the open-source React Native ecosystem. For the POC, whisper.rn + expo-av with energy-threshold VAD works. For production, expect to either adopt `@speechmatics/expo-two-way-audio` (which adds hardware AEC) or write a thin native module wrapping `AVAudioEngine`/`AudioTrack`.

The second insight: **Instructor's `Mode.JSON` is critical.** PydanticAI's default tool-calling mode and vLLM's structured output via tool parameters have documented compatibility issues with quantized models and nested schemas. JSON mode sidesteps all of these by putting the schema in the prompt and letting vLLM's constrained decoding (xgrammar backend) guarantee structural validity at the token level. This single choice eliminates the most likely class of runtime failures.

| Component | Choice | Runner-up |
|---|---|---|
| LLM extraction | **Instructor + Mode.JSON** | PydanticAI (if you later need full agent) |
| STT | **whisper.rn on-device** (base.en) | faster-whisper server (for accuracy upgrade) |
| TTS | **Kokoro-FastAPI** (Docker) | Piper TTS (CPU-only fallback) |
| RN audio capture | **whisper.rn RealtimeTranscriber** | @speechmatics/expo-two-way-audio |
| RN audio playback | **expo-av Sound** | @cjblack/expo-audio-stream |
| State machine | **enum+switch (TypeScript)** | XState (if flow exceeds ~10 states) |
| Provider matching | **In-memory filter+sort** | Nothing — embeddings are over-engineering |
| Session state | **In-memory Map** | Redis (if you need multi-instance) |
| App ↔ Backend | **WebSocket** | — |
| Internal services | **REST** | gRPC (irrelevant at POC scale) |