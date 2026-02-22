# Voice-First Cleaning Booking — POC

Validates: **can a user complete a cleaning booking entirely via voice in ≤6 turns with sub-2s round trips?**

## Architecture

```
📱 Expo App  (Android or Browser)
   whisper.rn [Android]  Web Speech API [Browser]  expo-av (TTS)
          │ WebSocket :3001
          ▼
🟢 Node.js API :3001
   State Machine    Provider Matcher    Session Store
       │ REST /extract              │ REST /v1/audio/speech
       ▼                            ▼
🐍 Python AI :8000          🔊 Kokoro-FastAPI :8880
   FastAPI + Instructor          Docker GPU image
   Mode.JSON extraction
       │ REST /v1/chat/completions
       ▼
🤖 vLLM :8080
   Any OpenAI-compatible model (configured via LLM_MODEL env var)
```

## Prerequisites

- vLLM already running on `:8080` (or update `VLLM_BASE_URL` in `poc/ai/.env`)
  - Must be launched **without** `--enable-auto-tool-choice`
- Docker + NVIDIA container toolkit (for Kokoro GPU)
- Node.js ≥ 20, Python ≥ 3.11
- **To test in browser (recommended for dev)**: Chrome or Edge (have Web Speech API built-in)
- **To test on device**: Android device + `adb` + Android Studio with NDK

---

## Quick Start

### 0. Check your running vLLM

Find the exact model name vLLM is serving — you'll need it in step 2:

```bash
curl -s http://localhost:8080/v1/models | jq '.data[].id'
```

### 1. Kokoro TTS

```bash
cd poc/
docker compose up -d

# Verify (should download an MP3):
curl -s -X POST http://localhost:8880/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"model":"kokoro","input":"hello","voice":"af_heart"}' \
  -o /tmp/test.mp3 && echo "OK: $(du -h /tmp/test.mp3)"
```

### 2. Python AI service

```bash
cd poc/ai/
cp .env.example .env
```

Edit `.env` — set `LLM_MODEL` to the model name from step 0, and update `VLLM_BASE_URL` if your vLLM is on a different port:

```ini
VLLM_BASE_URL=http://localhost:8000/v1
LLM_MODEL=<paste model id from step 0>
```

Then install and start:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8080 --reload
```

Verify extraction works end-to-end with your model:

```bash
curl -s -X POST http://localhost:8080/extract \
  -H 'Content-Type: application/json' \
  -d '{"transcript":"I need a deep clean next Tuesday at 2pm, about 3 hours, Lazimpat-7, Kathmandu"}' \
  | jq '{booking: .booking, missing: .missing_fields}'
```

Expected: `missing_fields` should be `[]` (all 5 fields extracted).

### 3. Node.js API

```bash
cd poc/api/
cp .env.example .env   # defaults are fine if using standard ports
pnpm install
pnpm start
```

Verify:

```bash
# HTTP health
curl -s http://localhost:3001/health | jq

# WebSocket smoke test (requires: npm install -g wscat)
wscat -c ws://localhost:3001
# paste: {"type":"TRANSCRIPT","sessionId":"s1","text":"I need a deep clean next Tuesday at 2pm"}
# expect: STATE_UPDATE JSON followed by binary audio frame
```

### 4. Expo app

The app runs in a browser (recommended for development) or on a physical Android device.
Both paths use the same codebase — Metro automatically selects the right STT implementation.

```bash
cd poc/mobile/
cp .env.example .env
npm install
```

#### Option A — Browser (no Android required)

```bash
npx expo start --web
# Opens http://localhost:8081 in your default browser
```

Use **Chrome or Edge** — both include the Web Speech API. Firefox requires enabling a flag
(`media.webspeech.recognition.enable` in `about:config`).

The mic button works the same way: hold to record, release to send. TTS audio plays back
via the browser's audio stack. No model download required.

#### Option B — Android device

```bash
# Connect device + enable USB debugging
adb reverse tcp:3001 tcp:3001    # forward device port to dev machine

# First build (requires Android Studio + NDK for whisper.rn native module)
npx expo prebuild --platform android
npx expo run:android
# whisper model (~142 MB) downloads on first launch and is cached
```

---

## Configuration reference

All runtime config lives in `.env` files — no code changes needed.

### `poc/ai/.env` (copy from `.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VLLM_BASE_URL` | `http://localhost:8080/v1` | vLLM base URL |
| `VLLM_API_KEY` | `not-required` | API key (vLLM accepts any value) |
| `LLM_MODEL` | `Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4` | **Must match model ID from `GET /v1/models`** |
| `LLM_TEMPERATURE` | `0.1` | Extraction temperature |
| `LLM_MAX_RETRIES` | `2` | Instructor retry count on malformed JSON |
| `PROMPTS_FILE` | `prompts.yaml` (next to `main.py`) | Override to swap prompt sets |

### `poc/api/.env` (copy from `.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP + WebSocket port |
| `AI_BASE_URL` | `http://localhost:8000` | Python AI service |
| `KOKORO_BASE_URL` | `http://localhost:8880` | Kokoro TTS service |
| `KOKORO_MODEL` | `kokoro` | Kokoro model name |
| `KOKORO_VOICE` | `af_heart` | TTS voice |
| `KOKORO_SPEED` | `1.0` | Speech rate |
| `KOKORO_FORMAT` | `mp3` | Audio format |
| `PROMPTS_FILE` | `prompts.json` (repo root of api/) | Override to swap response strings |

### `poc/mobile/.env` (copy from `.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_WS_URL` | `ws://localhost:3001` | WebSocket URL. Use LAN IP if not using `adb reverse` |

---

## 4-Turn Happy Path

| Turn | You say | System does |
|------|---------|-------------|
| 1 | "I need a deep clean next Tuesday around 2pm" | Extracts service_type, date, time → asks for duration + address |
| 2 | "About 3 hours, Lazimpat-7, Kathmandu" | Extracts remaining fields → matches 3 providers → reads them aloud |
| 3 | "The first one" | Identifies provider 1 → reads confirmation summary |
| 4 | "Confirm" | Creates booking → confirms with ID |

```bash
# Verify booking was created:
curl -s http://localhost:3001/bookings | jq
```

---

## Verification Checklist

- [ ] `curl /v1/models` on vLLM → model ID noted, copied into `poc/ai/.env`
- [ ] `docker compose up` → Kokoro returns MP3 on `/v1/audio/speech`
- [ ] `curl POST localhost:8000/extract` → `CleaningBooking` JSON, `missing_fields: []`
- [ ] `curl POST localhost:8000/extract` with partial transcript → `missing_fields` non-empty, `clarification_prompt` set
- [ ] `wscat` → send TRANSCRIPT → receive STATE_UPDATE JSON + binary audio frame
- [ ] **Browser**: `npx expo start --web` → app loads in Chrome/Edge, mic button visible, browser prompts for mic permission
- [ ] **Android**: app opens, whisper model downloads (~142 MB), mic button visible
- [ ] 4-turn happy path completes, booking visible at `GET localhost:3001/bookings`
- [ ] Barge-in: speak while TTS playing → TTS stops, new transcript processed

---

## IDE Notes

- **Pylance "import could not be resolved" warnings** in `poc/ai/` are expected — no
  global venv exists. They disappear once you activate the virtualenv from step 2.
  They have zero effect on runtime.
- **`__dirname` in ESM**: `provider-matcher.ts` uses `fileURLToPath(import.meta.url)` —
  required because `poc/api/package.json` sets `"type": "module"`.
- **Platform STT selection**: `useSpeechInput.web.ts` / `useSpeechInput.native.ts` are
  resolved by Metro at bundle time — `whisper.rn` is never included in the web bundle.

## Critical Notes

- **`Mode.JSON` not tool-calling**: vLLM GPTQ + nested Pydantic `$defs` via tool parameters
  is broken (vLLM issue #15035). The Python AI service uses `instructor.Mode.JSON` which
  puts the schema in the prompt and uses constrained decoding — reliable on quantized models.
- **Flat Pydantic models**: All models in `poc/ai/models.py` are intentionally flat
  (no nested sub-models) to avoid `$defs` issues.
- **vLLM must NOT use `--enable-auto-tool-choice`** flag.

## VRAM Budget (RTX 3060 12GB)

| Service | VRAM |
|---------|------|
| vLLM Qwen2.5-7B GPTQ-Int4 | ~6-7 GB |
| Kokoro CPU (current default) | 0 GB |
| **Total** | **~6-7 GB** |

`docker-compose.yml` defaults to the CPU image. To switch to GPU (lower latency,
~300ms vs ~600ms TTS), fix the toolkit first:
```bash
sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker
```
Then swap the commented/uncommented blocks in `docker-compose.yml`.
