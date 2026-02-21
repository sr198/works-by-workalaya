# Voice-First Cleaning Booking — POC

Validates: **can a user complete a cleaning booking entirely via voice in ≤6 turns with sub-2s round trips?**

## Architecture

```
📱 Android App (Expo)
   whisper.rn (on-device STT)    expo-av (TTS playback)
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
   Qwen2.5-7B-Instruct-GPTQ-Int4
```

## Prerequisites

- vLLM running on `:8080` with `Qwen2.5-7B-Instruct-GPTQ-Int4`
  - Launch **without** `--enable-auto-tool-choice`
- Docker + NVIDIA container toolkit (for Kokoro GPU)
- Node.js ≥ 20, Python ≥ 3.11
- Android device + `adb`

## Quick Start

### 1. Kokoro TTS
```bash
cd poc/
docker compose up -d
# Verify: curl http://localhost:8880/v1/audio/speech -d '{"model":"kokoro","input":"hello","voice":"af_heart"}' -o test.mp3
```

### 2. Python AI service
```bash
cd poc/ai/
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload

# Verify:
# curl -s -X POST localhost:8000/extract \
#   -H 'Content-Type: application/json' \
#   -d '{"transcript":"I need a deep clean next Tuesday at 2pm, about 3 hours, 742 Evergreen Terrace"}' | jq
```

### 3. Node.js API
```bash
cd poc/api/
cp .env.example .env   # edit if your services run on different ports
pnpm install
pnpm start

# Verify:
# curl localhost:3001/health
# wscat -c ws://localhost:3001
# Then send: {"type":"TRANSCRIPT","sessionId":"s1","text":"I need a deep clean next Tuesday at 2pm"}
```

### 4. Mobile app
```bash
cd poc/mobile/
cp .env.example .env   # set EXPO_PUBLIC_WS_URL if not using adb reverse

npm install            # Expo projects use npm, not pnpm

# Connect Android device + enable USB debugging
adb reverse tcp:3001 tcp:3001    # forward device port to dev machine

# First build (requires Android Studio + NDK for whisper.rn native module)
npx expo prebuild --platform android
npx expo run:android
```

> **No Android device yet? Mock STT mode**: in `BookingScreen.tsx`, replace
> `useWhisper(...)` with a simple `TextInput` that calls `flow.sendTranscript(text)`
> on submit. The rest of the flow (WebSocket → backend → TTS playback) works identically.

## 4-Turn Happy Path

| Turn | You say | System does |
|------|---------|-------------|
| 1 | "I need a deep clean next Tuesday around 2pm" | Extracts service_type, date, time → asks for duration + address |
| 2 | "About 3 hours, 742 Evergreen Terrace" | Extracts remaining fields → matches 3 providers → reads them aloud |
| 3 | "The first one" | Identifies provider 1 → reads confirmation summary |
| 4 | "Confirm" | Creates booking → confirms with ID |

```bash
# Verify booking created:
curl localhost:3001/bookings | jq
```

## IDE Notes

- **Pylance "import could not be resolved" warnings** in `poc/ai/` are expected — no
  global venv exists. They disappear once you activate the virtualenv created in step 2.
  They have zero effect on runtime.
- **`__dirname` in ESM**: `provider-matcher.ts` uses `fileURLToPath(import.meta.url)` —
  required because `poc/api/package.json` sets `"type": "module"`.

## Critical Notes

- **`Mode.JSON` not tool-calling**: vLLM GPTQ + nested Pydantic `$defs` via tool parameters is broken (issue #15035). The Python AI service uses `instructor.Mode.JSON` which puts the schema in the prompt and uses constrained decoding.
- **Flat Pydantic models**: All models in `poc/ai/models.py` are intentionally flat (no nested sub-models) to avoid `$defs` issues.
- **vLLM must NOT use `--enable-auto-tool-choice`** flag.

## Verification Checklist

- [ ] `docker compose up` → Kokoro returns MP3 on `/v1/audio/speech`
- [ ] `curl POST localhost:8000/extract` returns `CleaningBooking` JSON
- [ ] `wscat -c ws://localhost:3001` → TRANSCRIPT message → STATE_UPDATE + binary audio
- [ ] Android app opens, whisper model downloads (~142 MB), mic button visible
- [ ] 4-turn happy path completes, booking at `GET localhost:3001/bookings`
- [ ] Barge-in: speak while TTS playing → TTS stops, new transcript processed

## VRAM Budget (RTX 3060 12GB)

| Service | VRAM |
|---------|------|
| vLLM Qwen2.5-7B GPTQ-Int4 | ~6-7 GB |
| Kokoro GPU | ~2 GB |
| Total | ~8-9 GB |

If over budget, switch to `kokoro-fastapi-cpu:latest` in `docker-compose.yml`.
