# V2 Implementation Plan: Declarative, Multi-Service, Hybrid NLG

> Migrating from a cleaning-only voice booking POC to a declarative, service-agnostic intent engine with hybrid response generation and a bounded agentic router.

---

## Current State (V1 Inventory)

Before outlining each phase, here is a precise inventory of V1 files that will be migrated or replaced. Every entry below maps to a concrete action in a later phase.

### Node API (`poc/api/`)

| File | Role | V2 Fate |
|---|---|---|
| `src/state-machine.ts` | 7-state enum+switch (`IDLE → EXTRACTING → CLARIFYING → ADDRESS_CONFIRM → PROVIDER_SELECTION → CONFIRMING → BOOKED`) | Replace with generic workflow kernel (Phase 2) |
| `src/ws-handler.ts` | All orchestration logic — extraction, address confirm, provider selection, confirmation. Tightly coupled to cleaning fields. | Refactor into service-agnostic orchestrator (Phase 2) |
| `src/session-store.ts` | `BookingContext` with cleaning-typed `booking` field (`Partial<{service_type, date, time, duration_hours, location}>`) | Replace with generic `Record<string, unknown>` slot store (Phase 2) |
| `src/ai-client.ts` | REST client for Python `/extract` and `/select` | Extend with `/respond` call, update `/extract` contract (Phase 2, 3) |
| `src/response-builder.ts` | `buildPrompt()` switch on `BookingState` — returns static template text | Replace with response policy engine (Phase 3) |
| `src/prompts.ts` | Loads `prompts.json`, provides typed template helpers | Replace with service-pack prompt loader (Phase 1) |
| `src/provider-matcher.ts` | In-memory `filter → haversine → availability → sort` pipeline, hardcoded 25km radius | Make matcher pluggable by service pack config (Phase 1) |
| `src/tts-client.ts` | Kokoro REST client | No change |
| `src/bookings.ts` | In-memory booking store | Minimal change (generalize booking shape) |
| `src/config.ts` | Env-based config (`AI_BASE_URL`, `KOKORO_*`, `PROMPTS_FILE`) | Extend with service-pack root path |
| `src/main.ts` / `src/ws-server.ts` | HTTP+WS server bootstrap | Extend with service-pack loader init |
| `prompts.json` | 20 template strings for cleaning flow | Move into `services/cleaning/prompts.en.yaml` (Phase 1) |

### Python AI (`poc/ai/`)

| File | Role | V2 Fate |
|---|---|---|
| `main.py` | FastAPI app with `/extract`, `/select`, `/health` | Add `/respond` endpoint (Phase 3) |
| `extractor.py` | Instructor Mode.JSON extraction against `CleaningBooking` model | Make schema-driven from request payload (Phase 2) |
| `selector.py` | Provider selection + confirmation extraction | No major change |
| `models.py` | `CleaningBooking`, `ExtractionResult`, `ProviderSelectionResult` — flat Pydantic models | Replace `CleaningBooking` with dynamic schema; keep `ProviderSelectionResult` |
| `prompts.py` | Loads `prompts.yaml`, exposes `ExtractionPrompts` and `SelectionPrompts` classes | Refactor to load from service-pack prompt files (Phase 1) |
| `prompts.yaml` | Extraction system/user templates, field questions, selection prompts | Move into `services/cleaning/prompts.en.yaml` (Phase 1) |
| `config.py` | Env vars for vLLM URL, model name, temperature, retries | Extend with service-pack root |

### Data (`poc/data/`)

| File | Role | V2 Fate |
|---|---|---|
| `providers.json` | 25 cleaning providers (Kathmandu) | Move to `services/cleaning/providers.json` (Phase 1) |
| `user.json` | Mock user profile | Keep as-is |

---

## Target Directory Structure (End State)

```
poc/
├── services/                              # ← NEW: Declarative service packs
│   ├── cleaning/
│   │   ├── service.yaml                   # slot schema, matcher config, response policy
│   │   ├── prompts.en.yaml                # extraction, selection, templates, nlg constraints
│   │   ├── prompts.ne.yaml                # Nepali locale (stretch)
│   │   └── providers.json                 # provider data
│   └── tutoring/                          # Phase 5
│       ├── service.yaml
│       ├── prompts.en.yaml
│       └── providers.json
│
├── api/
│   ├── src/
│   │   ├── main.ts                        # bootstrap + service-pack loader init
│   │   ├── ws-server.ts                   # WebSocket server creation
│   │   ├── ws-handler.ts                  # ← REFACTORED: service-agnostic orchestrator
│   │   ├── config.ts                      # ← EXTENDED: SERVICE_PACK_ROOT
│   │   │
│   │   ├── kernel/                        # ← NEW: Workflow kernel
│   │   │   ├── states.ts                  # generic states enum
│   │   │   ├── transition.ts              # config-driven transition function
│   │   │   └── types.ts                   # SessionContext, SlotStore, StateEvent
│   │   │
│   │   ├── service-pack/                  # ← NEW: Service pack runtime
│   │   │   ├── loader.ts                  # YAML loader + validation
│   │   │   ├── registry.ts                # loaded service packs in memory
│   │   │   ├── schema.ts                  # Zod schema for service.yaml validation
│   │   │   └── types.ts                   # ServicePack, SlotDefinition, MatcherConfig
│   │   │
│   │   ├── response/                      # ← NEW: Response policy engine
│   │   │   ├── policy.ts                  # template vs llm_optional routing
│   │   │   ├── template-renderer.ts       # {key} interpolation from prompt pack
│   │   │   ├── llm-responder.ts           # calls Python /respond
│   │   │   ├── guardrails.ts              # required_mentions, length, contradiction checks
│   │   │   └── intent.ts                  # ResponseIntent type + builder
│   │   │
│   │   ├── matcher/                       # ← NEW: Pluggable matcher layer
│   │   │   ├── registry.ts                # matcher lookup by id
│   │   │   ├── geo-availability.ts        # current V1 logic (extracted)
│   │   │   └── types.ts                   # MatcherPlugin interface
│   │   │
│   │   ├── router/                        # ← NEW: LangGraph bounded router (Phase 4)
│   │   │   ├── graph.ts                   # LangGraph state graph definition
│   │   │   ├── tools.ts                   # tool catalog wrappers
│   │   │   ├── allow-list.ts              # state→allowed actions map
│   │   │   └── types.ts                   # RouterRequest, RouterResponse
│   │   │
│   │   ├── session-store.ts               # ← REFACTORED: generic slots
│   │   ├── ai-client.ts                   # ← EXTENDED: /respond
│   │   ├── tts-client.ts                  # unchanged
│   │   └── bookings.ts                    # generalized
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── ai/
│   ├── main.py                            # ← EXTENDED: /respond endpoint
│   ├── extractor.py                       # ← REFACTORED: dynamic schema
│   ├── responder.py                       # ← NEW: LLM response generator
│   ├── selector.py                        # minimal change
│   ├── models.py                          # ← REFACTORED: generic extraction result
│   ├── prompts.py                         # ← REFACTORED: service-pack aware
│   ├── config.py                          # ← EXTENDED: SERVICE_PACK_ROOT
│   └── requirements.txt                   # + langgraph deps (Phase 4)
│
├── data/
│   └── user.json
│
├── mobile/                                # minimal changes
│
└── docker-compose.yml
```

---

## Phase 1: Extract Domain Artifacts into Service Packs

**Goal:** Move all cleaning-specific data (prompts, provider data, slot definitions) into a declarative service pack. No behavior changes — V1 flow works identically afterward, just reads from new locations.

**Milestone:** M1 — service-pack loader + cleaning migrated.

### Step 1.1 — Create Service Pack Schema and Types

**New file: `poc/api/src/service-pack/types.ts`**

Define TypeScript types that map to `service.yaml` structure:

```typescript
interface ServicePack {
  service_id: string;
  version: number;
  workflow_type: "booking_slot_fill";

  slots: Record<string, SlotDefinition>;
  clarification: ClarificationConfig;
  matcher: MatcherConfig;
  response_policy: ResponsePolicyConfig;
}

interface SlotDefinition {
  type: "enum" | "date" | "time" | "number" | "string";
  values?: string[];     // for enum type
  required: boolean;
}

interface ClarificationConfig {
  priority_order: string[];
  max_slots_per_turn: number;
}

interface MatcherConfig {
  id: string;
  params: Record<string, unknown>;
}

interface ResponsePolicyConfig {
  default_mode: "template" | "llm_optional";
  turn_modes: Record<string, "template" | "template_strict" | "llm_optional">;
  llm_constraints: {
    max_chars: number;
    timeout_ms: number;
    temperature: number;
  };
}
```

**New file: `poc/api/src/service-pack/schema.ts`**

Zod validation schema for `service.yaml` to catch config errors at startup:

- Validate `workflow_type` is in supported set (only `booking_slot_fill` for V2)
- Validate slot types are recognized
- Validate `clarification.priority_order` references only defined slot names
- Validate `matcher.id` is in the matcher registry
- Validate `response_policy.turn_modes` values are from allowed set

### Step 1.2 — Create Cleaning Service Pack Files

**New file: `poc/services/cleaning/service.yaml`**

Derived from current hardcoded behavior:

```yaml
service_id: cleaning
version: 1
workflow_type: booking_slot_fill

slots:
  service_type:
    type: enum
    values: [standard, deep, move_in_out]
    required: true
  date:
    type: date
    required: true
  time:
    type: time
    required: true
  duration_hours:
    type: number
    required: true
  location:
    type: string
    required: false

clarification:
  priority_order: [service_type, date, time, duration_hours, location]
  max_slots_per_turn: 2

matcher:
  id: geo_availability_v1
  params:
    radius_km: 25
    max_results: 3

response_policy:
  default_mode: template
  turn_modes:
    collecting_ack: llm_optional
    clarifying: template
    options_list: template
    confirmation_summary: template_strict
    fallback_repair: llm_optional
    completion: template
  llm_constraints:
    max_chars: 280
    timeout_ms: 900
    temperature: 0.2
```

**New file: `poc/services/cleaning/prompts.en.yaml`**

Merge content from current `poc/ai/prompts.yaml` and `poc/api/prompts.json` into a unified prompt pack:

```yaml
extraction:
  system: |
    You are a booking assistant for a home cleaning service.
    Extract booking details from the user's voice transcript.
    Only set fields you are confident about from the transcript.
    Do not invent or guess values.
    Today is {today}.
    Resolve relative dates: "tomorrow", "next Tuesday", "this Friday", etc.
  user: |
    Transcript: "{transcript}"{existing_context}
    Extract any cleaning booking details mentioned.
  existing_context_prefix: "\nAlready known: "
  field_questions:
    service_type: "What type of cleaning do you need — standard, deep clean, or move-in/move-out?"
    date: "What date would you like the cleaning?"
    time: "What time works best for you?"
    duration_hours: "How many hours do you estimate the cleaning will take?"

selection:
  select_system: |
    You are a booking assistant. Identify which provider the user selected.
    They may say "the first one", "number 2", "option 3", or use the provider name.
    Available providers:
    {provider_list}
    Return the provider_id of the selected provider, or null if unclear.
  select_user: "User said: \"{transcript}\"\n\nWhich provider did they select?"
  confirm_system: |
    You are a booking assistant. Determine if the user confirmed their selection.
    Affirmative words: yes, confirm, correct, that's right, go ahead, book it, sure, okay, ok.
    Return confirmed=true if any affirmative word is present.
  confirm_user: "User said: \"{transcript}\"\n\nDid they confirm the booking?"

template_responses:
  extracting: "Got it, let me find the details for your booking."
  clarifying_fallback: "I need a few more details. What type of cleaning, and what date and time works for you?"
  address_confirm: "I'll look for cleaners near your registered address: {address}. Does that sound right?"
  address_confirm_proceed: "No problem, I'll use your registered address at {address} for now."
  no_providers: "I'm sorry, I couldn't find any available cleaners near you matching your request. Could you try a different date or service type?"
  provider_intro: "I found {count} cleaners near you."
  provider_option: "Option {index}: {name}, rated {rating} stars, {distance} kilometres away, available at {time}, {rate} per hour."
  provider_outro: "Which one would you like?"
  confirming: "Great choice! To confirm: {providerName} will do a {service} at {location} on {date} at {time} for {duration} hours. Total estimate: {total}. Say confirm to book."
  booked: "Your booking is confirmed! Booking ID {bookingId}. You'll receive a confirmation shortly. Is there anything else?"
  idle: "I'm ready to help you book a cleaner. What do you need?"
  barge_in: "Go ahead, I'm listening."
  session_limit: "Session limit reached. Starting over."
  already_booked: "Your booking is already confirmed! Say 'new booking' to start again."
  provider_not_found: "I couldn't find that provider. Please try again."
  provider_retry: "Sorry, I didn't catch that."
  provider_error: "Something went wrong. Let me show you the options again."
  confirm_retry: "Please say 'confirm' to complete the booking, or say 'go back' to choose a different option."
  currency: "NPR"
  locale: "en-NP"

nlg_responses:
  style: "Conversational, friendly, concise. Speak as a helpful assistant, not a robot."
  persona: "A friendly booking assistant for home cleaning services in Kathmandu."
  forbidden_phrases: ["I'm an AI", "As a language model", "I cannot"]
```

**Move: `poc/data/providers.json` → `poc/services/cleaning/providers.json`**

### Step 1.3 — Build Service Pack Loader

**New file: `poc/api/src/service-pack/loader.ts`**

Responsibilities:
- Scan `SERVICE_PACK_ROOT` (default: `poc/services/`) for directories
- For each directory: parse `service.yaml`, validate against Zod schema, parse `prompts.{locale}.yaml`
- Load `providers.json` if present
- Return a `Map<string, LoadedServicePack>` keyed by `service_id`

```typescript
interface LoadedServicePack {
  config: ServicePack;
  prompts: Record<string, PromptPack>;  // keyed by locale
  providers: Provider[];
}
```

**New file: `poc/api/src/service-pack/registry.ts`**

In-memory registry:
- `loadAll(root: string): void` — called at startup
- `get(serviceId: string): LoadedServicePack` — used by orchestrator
- `listServices(): string[]` — for debugging/admin

### Step 1.4 — Rewire Node Orchestrator to Use Service Pack

**Modify: `poc/api/src/config.ts`**

Add `SERVICE_PACK_ROOT` env var (default: `../services`).

**Modify: `poc/api/src/main.ts`**

At startup, call `loadAll(config.servicePackRoot)`.

**Modify: `poc/api/src/prompts.ts`**

Replace direct `prompts.json` loading with delegation to service-pack registry. For Phase 1 backward compatibility, default to `cleaning` service:

```typescript
export function getPrompts(serviceId: string, locale: string) {
  const pack = registry.get(serviceId);
  return pack.prompts[locale].template_responses;
}
```

**Modify: `poc/api/src/provider-matcher.ts`**

Instead of loading `../../data/providers.json` directly, accept providers array from service pack:

```typescript
export function matchProviders(criteria: MatchCriteria, providers: Provider[]): MatchedProvider[]
```

Remove the internal `getProviders()` / `DATA_PATH` loading logic.

### Step 1.5 — Rewire Python AI to Read From Service Pack

**Modify: `poc/ai/config.py`**

Add `SERVICE_PACK_ROOT` env var.

**Modify: `poc/ai/prompts.py`**

Replace single-file loading with service-pack-aware loading:

```python
def load_prompts(service_id: str, locale: str = "en") -> dict:
    path = Path(SERVICE_PACK_ROOT) / service_id / f"prompts.{locale}.yaml"
    ...
```

Phase 1 keeps the function signature compatible — `extract_booking()` still uses `extraction` section prompts, just loaded from the service pack path instead of the standalone `prompts.yaml`.

### Step 1.6 — Delete Superseded V1 Files

After verifying functional equivalence:
- Delete `poc/api/prompts.json` (moved to `services/cleaning/prompts.en.yaml`)
- Delete `poc/ai/prompts.yaml` (moved to `services/cleaning/prompts.en.yaml`)
- Delete `poc/data/providers.json` (moved to `services/cleaning/providers.json`)

### Phase 1 Verification

- Run the full cleaning booking flow end-to-end
- Confirm identical 4-turn conversation with same response templates
- Confirm provider matching returns same results
- Confirm extraction works with same prompts loaded from new path

---

## Phase 2: Generic Slot Store + Dynamic Extract Contract

**Goal:** Replace `CleaningBooking` with a service-agnostic slot model driven by the service pack schema. Update the Python `/extract` endpoint to accept dynamic schema context.

**Milestone:** M2 — dynamic extractor contract live.

### Step 2.1 — Define Generic Workflow Kernel Types

**New file: `poc/api/src/kernel/types.ts`**

```typescript
interface SessionContext {
  sessionId: string;
  serviceId: string;
  state: WorkflowState;
  turnCount: number;
  slots: Record<string, unknown>;          // service-agnostic slot store
  missingRequired: string[];
  candidates: MatchedProvider[];
  selectedProviderId: string | null;
  confirmedBookingId: string | null;
  lastActivity: number;
}
```

### Step 2.2 — Define Generic Workflow States

**New file: `poc/api/src/kernel/states.ts`**

Replace V1 `BookingState` enum with V2 generic states:

```typescript
enum WorkflowState {
  IDLE = "IDLE",
  COLLECTING = "COLLECTING",
  CLARIFYING = "CLARIFYING",
  OPTIONS = "OPTIONS",
  CONFIRMING = "CONFIRMING",
  COMPLETED = "COMPLETED",
}
```

Key mapping from V1:
- `IDLE` → `IDLE` (unchanged)
- `EXTRACTING` → `COLLECTING` (renamed; extraction is an operation within collecting, not a state the user sees)
- `CLARIFYING` → `CLARIFYING` (unchanged)
- `ADDRESS_CONFIRM` → absorbed into `COLLECTING` or `CLARIFYING` logic (address is just another slot; for V2, if `location` is not required, skip the confirm)
- `PROVIDER_SELECTION` → `OPTIONS`
- `CONFIRMING` → `CONFIRMING`
- `BOOKED` → `COMPLETED`

### Step 2.3 — Config-Driven Transition Function

**New file: `poc/api/src/kernel/transition.ts`**

The transition function reads required slots from the service pack:

```typescript
function transition(
  ctx: SessionContext,
  event: StateEvent,
  servicePack: ServicePack
): SessionContext {
  switch (ctx.state) {
    case WorkflowState.IDLE:
      if (event.type === "USER_MESSAGE")
        return { ...ctx, state: WorkflowState.COLLECTING };
      break;

    case WorkflowState.COLLECTING:
    case WorkflowState.CLARIFYING:
      if (event.type === "EXTRACTION_DONE") {
        const required = Object.entries(servicePack.slots)
          .filter(([, def]) => def.required)
          .map(([name]) => name);
        const missing = required.filter(name => ctx.slots[name] == null);

        if (missing.length === 0)
          return { ...ctx, state: WorkflowState.OPTIONS, missingRequired: [] };
        return { ...ctx, state: WorkflowState.CLARIFYING, missingRequired: missing };
      }
      break;

    case WorkflowState.OPTIONS:
      if (event.type === "PROVIDER_SELECTED")
        return { ...ctx, state: WorkflowState.CONFIRMING };
      break;

    case WorkflowState.CONFIRMING:
      if (event.type === "CONFIRMED")
        return { ...ctx, state: WorkflowState.COMPLETED };
      if (event.type === "BARGE_IN")
        return { ...ctx, state: WorkflowState.OPTIONS };
      break;
  }
  return ctx;
}
```

No service-specific branches. The kernel doesn't know what "service_type" or "date" means — it just counts required slots.

### Step 2.4 — Refactor Session Store

**Modify: `poc/api/src/session-store.ts`**

- Replace typed `booking` field with `slots: Record<string, unknown>`
- Add `serviceId: string` field
- Add `missingRequired: string[]` field
- Remove cleaning-specific typing

### Step 2.5 — Update Python `/extract` Contract

**Modify: `poc/ai/main.py`**

New request schema for `/extract`:

```python
class ExtractRequest(BaseModel):
    service_id: str
    locale: str = "en"
    state: str                      # current workflow state
    transcript: str
    existing_slots: dict = {}
    slot_schema: dict               # { "date": { "type": "date", "required": true }, ... }
```

New response schema:

```python
class ExtractResponse(BaseModel):
    slot_updates: dict              # { "date": "2026-02-24", "time": "14:00" }
    missing_required: list[str]     # ["duration_hours"]
    confidence: dict[str, float]    # { "date": 0.93, "time": 0.88 }
```

### Step 2.6 — Dynamic Schema Extraction in Python

**Modify: `poc/ai/extractor.py`**

Replace hardcoded `CleaningBooking` model with dynamically constructed Pydantic model:

```python
from pydantic import create_model

def build_extraction_model(slot_schema: dict) -> type[BaseModel]:
    """Build a flat Pydantic model from the slot schema at call time."""
    fields = {}
    for name, definition in slot_schema.items():
        python_type = SLOT_TYPE_MAP[definition["type"]]
        fields[name] = (Optional[python_type], None)
    return create_model("DynamicBooking", **fields)
```

`SLOT_TYPE_MAP`:
- `"enum"` → `str` (with allowed values in the field description)
- `"date"` → `str` (YYYY-MM-DD)
- `"time"` → `str` (HH:MM)
- `"number"` → `float`
- `"string"` → `str`

The system prompt is now assembled from service-pack prompt templates + the dynamic slot schema, passed in the request.

### Step 2.7 — Update Node AI Client

**Modify: `poc/api/src/ai-client.ts`**

Update `extractBooking()` to send the new contract:

```typescript
async function extractBooking(
  serviceId: string,
  locale: string,
  state: string,
  transcript: string,
  existingSlots: Record<string, unknown>,
  slotSchema: Record<string, SlotDefinition>,
): Promise<ExtractResponse>
```

### Step 2.8 — Refactor Orchestrator

**Modify: `poc/api/src/ws-handler.ts`**

Refactor `handleTranscript()` to use:
- Service pack from registry (looked up by `serviceId` on the session)
- Generic `SessionContext` instead of `BookingContext`
- New extract contract
- Kernel transition function

The `handleExtraction()` function becomes service-agnostic:

```typescript
async function handleCollecting(ws, sessionId, text) {
  const ctx = getOrCreateSession(sessionId);
  const pack = registry.get(ctx.serviceId);

  const result = await extractBooking(
    ctx.serviceId, "en", ctx.state, text,
    ctx.slots, pack.config.slots
  );

  // Merge slot updates
  const updatedSlots = { ...ctx.slots, ...result.slot_updates };

  // Transition
  const newCtx = transition(
    { ...ctx, slots: updatedSlots },
    { type: "EXTRACTION_DONE" },
    pack.config
  );

  updateSession(sessionId, { state: newCtx.state, slots: updatedSlots, missingRequired: newCtx.missingRequired });

  // Build response intent and render
  // ...
}
```

### Phase 2 Verification

- Run cleaning flow end-to-end with dynamic schema extraction
- Confirm slot extraction produces same results as V1 `CleaningBooking`
- Confirm state transitions match V1 behavior
- Confirm no cleaning-specific code remains in kernel or orchestrator

---

## Phase 3: Response Policy Engine

**Goal:** Introduce `response_intent` as an intermediate object. Implement template rendering and optional LLM response path. Add guardrail validation and fallback.

**Milestone:** M3 — response policy engine with template + llm_optional.

### Step 3.1 — Define Response Intent Type

**New file: `poc/api/src/response/intent.ts`**

```typescript
interface ResponseIntent {
  intent_id: string;           // e.g. "confirmation_summary", "collecting_ack", "clarifying"
  service_id: string;
  locale: string;
  facts: Record<string, unknown>;
  required_mentions: string[];
  mode: "template" | "template_strict" | "llm_optional";
}
```

Builder function that constructs intent from current state + slot values:

```typescript
function buildResponseIntent(
  state: WorkflowState,
  ctx: SessionContext,
  pack: LoadedServicePack,
  extraFacts?: Record<string, unknown>,
): ResponseIntent
```

The intent builder reads `response_policy.turn_modes` from the service pack to set `mode`.

### Step 3.2 — Template Renderer

**New file: `poc/api/src/response/template-renderer.ts`**

Replaces V1 `response-builder.ts` and `prompts.ts`:

```typescript
function renderTemplate(
  intent: ResponseIntent,
  prompts: PromptPack,
): string {
  const template = prompts.template_responses[intent.intent_id];
  return interpolate(template, intent.facts);
}
```

Uses the same `{key}` interpolation as V1 but reads templates from the service pack prompt file.

### Step 3.3 — LLM Responder (Python Side)

**New file: `poc/ai/responder.py`**

```python
def generate_response(
    intent: dict,
    prompts: dict,
    constraints: dict,
) -> dict:
    """Generate conversational response text using LLM."""
    style_guide = prompts.get("nlg_responses", {})

    system = f"""
    You are {style_guide.get('persona', 'a helpful assistant')}.
    Style: {style_guide.get('style', 'conversational')}.
    Generate a spoken response for this situation.
    You MUST mention: {intent['required_mentions']}.
    Max length: {constraints['max_chars']} characters.
    Do NOT say: {style_guide.get('forbidden_phrases', [])}.
    """

    user = f"""
    Intent: {intent['intent_id']}
    Facts: {json.dumps(intent['facts'])}
    Generate a natural, spoken response.
    """

    # Use Instructor with timeout
    ...
    return {"text": generated_text, "rationale": "..."}
```

**Modify: `poc/ai/main.py`**

Add `/respond` endpoint:

```python
class RespondRequest(BaseModel):
    intent: dict        # ResponseIntent
    prompts: dict       # nlg_responses section from prompt pack
    constraints: dict   # max_chars, timeout_ms, temperature

class RespondResponse(BaseModel):
    text: str
    rationale: Optional[str] = None

@app.post("/respond", response_model=RespondResponse)
def respond(req: RespondRequest):
    return generate_response(req.intent, req.prompts, req.constraints)
```

### Step 3.4 — Response Policy Engine (Node Side)

**New file: `poc/api/src/response/policy.ts`**

Orchestrates the response generation strategy:

```typescript
async function generateResponse(intent: ResponseIntent, pack: LoadedServicePack): Promise<string> {
  const mode = intent.mode;

  // Template path (always available)
  if (mode === "template" || mode === "template_strict") {
    return renderTemplate(intent, pack.prompts["en"]);
  }

  // LLM path (llm_optional)
  if (mode === "llm_optional") {
    try {
      const llmText = await callResponder(intent, pack);
      const validation = validateResponse(llmText, intent);
      if (validation.passed) return llmText;
      console.warn("[Response] LLM failed guardrails, falling back to template:", validation.reason);
    } catch (err) {
      console.warn("[Response] LLM generation failed, falling back to template:", err);
    }
    // Fallback
    return renderTemplate(intent, pack.prompts["en"]);
  }

  return renderTemplate(intent, pack.prompts["en"]);
}
```

### Step 3.5 — Response Guardrails

**New file: `poc/api/src/response/guardrails.ts`**

Validation checks run before TTS synthesis for LLM-generated text:

```typescript
interface ValidationResult {
  passed: boolean;
  reason?: string;
}

function validateResponse(text: string, intent: ResponseIntent): ValidationResult {
  // 1. Check required mentions
  for (const mention of intent.required_mentions) {
    const factValue = String(intent.facts[mention] ?? "");
    if (!text.toLowerCase().includes(factValue.toLowerCase())) {
      return { passed: false, reason: `Missing required mention: ${mention}` };
    }
  }

  // 2. Check length cap
  if (text.length > (intent.facts._max_chars as number ?? 280)) {
    return { passed: false, reason: "Exceeds length cap" };
  }

  // 3. Check no contradictions with known facts
  // (compare numeric values, dates mentioned in text against facts)

  return { passed: true };
}
```

### Step 3.6 — Update AI Client

**Modify: `poc/api/src/ai-client.ts`**

Add `callResponder()`:

```typescript
async function callResponder(
  intent: ResponseIntent,
  pack: LoadedServicePack,
): Promise<string> {
  const constraints = pack.config.response_policy.llm_constraints;
  const result = await post<{ text: string }>("/respond", {
    intent,
    prompts: pack.prompts["en"].nlg_responses,
    constraints,
  });
  return result.text;
}
```

### Step 3.7 — Integrate Into Orchestrator

**Modify: `poc/api/src/ws-handler.ts`**

Replace all `buildPrompt()` calls with:

```typescript
const intent = buildResponseIntent(newState, ctx, pack, extraFacts);
const responseText = await generateResponse(intent, pack);
await sendAndSpeak(ws, newState, responseText, extra);
```

### Step 3.8 — Delete Superseded V1 Files

- Delete `poc/api/src/response-builder.ts` (replaced by `response/` module)
- Delete `poc/api/src/prompts.ts` (replaced by service-pack loader)

### Phase 3 Verification

- Cleaning flow still works end-to-end with template-only mode
- Set `collecting_ack: llm_optional` in service config and verify LLM generates a natural acknowledgment
- Verify fallback: kill Python `/respond` endpoint and confirm template fallback triggers
- Verify guardrails: manually return LLM text missing a required mention, confirm fallback
- Verify latency: template turns maintain V1 latency; `llm_optional` turns stay under 2.5s

---

## Phase 4: LangGraph Bounded Router

**Goal:** Add a thin agentic layer that can interpret ambiguous intent, pick tool sequences, and recover from non-linear dialogue, while keeping all booking writes and confirmations in the deterministic kernel.

**Milestone:** M4 — LangGraph bounded router + tool contracts live.

### Step 4.1 — Add LangGraph Dependency

**Modify: `poc/api/package.json`**

```json
"dependencies": {
  "@langchain/langgraph": "^0.x",
  "@langchain/core": "^0.x",
  "ws": "^8.18.0"
}
```

Note: LangGraph has a JS/TS SDK. If the JS SDK is not mature enough at implementation time, an alternative is to expose the router as a Python service (LangGraph Python is more mature) and call it via REST from Node. This would mean:

- **Option A (preferred):** LangGraph TS in Node process — lower latency, no extra service
- **Option B (fallback):** LangGraph Python as `poc/ai/router.py` — higher latency, requires additional endpoint

Decide at implementation time based on LangGraph JS SDK maturity.

### Step 4.2 — Define Tool Catalog

**New file: `poc/api/src/router/tools.ts`**

Each tool wraps a deterministic service operation:

```typescript
const TOOL_CATALOG = {
  extract_slots: {
    description: "Extract booking slot values from user transcript",
    inputSchema: { transcript: "string" },
    execute: async (args, ctx) => extractBooking(ctx.serviceId, ...),
  },
  search_providers: {
    description: "Search for available service providers matching slot criteria",
    inputSchema: { slots: "Record<string, unknown>" },
    execute: async (args, ctx) => matchProviders(criteria, providers),
  },
  select_provider: {
    description: "Mark a provider as selected by the user",
    inputSchema: { provider_id: "string" },
    execute: async (args, ctx) => { /* validate + update session */ },
  },
  create_booking: {
    description: "Create a booking with the selected provider",
    inputSchema: { session_id: "string" },
    execute: async (args, ctx) => { /* only if state === CONFIRMING */ },
  },
  ask_clarification: {
    description: "Ask the user to provide missing information",
    inputSchema: { question: "string" },
    execute: async (args, ctx) => ({ response_text: args.question }),
  },
};
```

### Step 4.3 — State-Scoped Allow Lists

**New file: `poc/api/src/router/allow-list.ts`**

Map each workflow state to allowed tool actions:

```typescript
const STATE_ALLOW_LIST: Record<WorkflowState, string[]> = {
  IDLE:        ["extract_slots"],
  COLLECTING:  ["extract_slots", "ask_clarification"],
  CLARIFYING:  ["extract_slots", "ask_clarification"],
  OPTIONS:     ["search_providers", "select_provider", "ask_clarification"],
  CONFIRMING:  ["create_booking", "ask_clarification"],
  COMPLETED:   [],
};
```

### Step 4.4 — LangGraph State Graph

**New file: `poc/api/src/router/graph.ts`**

Define a minimal LangGraph state graph:

```
[receive_input] → [plan_action] → [validate_action] → [execute_tool] → [return_result]
```

- **receive_input**: Takes `RouterRequest` (session state, transcript, slots, allowed actions)
- **plan_action**: LLM selects one tool from allowed list
- **validate_action**: Checks selected action is in allow list; if not, emit `ask_clarification`
- **execute_tool**: Runs the tool deterministically
- **return_result**: Returns `RouterResponse` to kernel

### Step 4.5 — Router Request/Response Contract

**New file: `poc/api/src/router/types.ts`**

```typescript
interface RouterRequest {
  session_id: string;
  service_id: string;
  state: WorkflowState;
  transcript: string;
  slots: Record<string, unknown>;
  allowed_actions: string[];
  tool_context: Record<string, unknown>;
}

interface RouterResponse {
  action: string;
  args: Record<string, unknown>;
  reason_code: string;
}
```

### Step 4.6 — Integrate Router Into Orchestrator

**Modify: `poc/api/src/ws-handler.ts`**

Add router as an optional layer. When enabled:

```typescript
async function handleTranscript(ws, sessionId, text) {
  const ctx = getOrCreateSession(sessionId);
  const pack = registry.get(ctx.serviceId);

  if (config.routerEnabled) {
    const routerResult = await invokeRouter({
      session_id: sessionId,
      service_id: ctx.serviceId,
      state: ctx.state,
      transcript: text,
      slots: ctx.slots,
      allowed_actions: STATE_ALLOW_LIST[ctx.state],
      tool_context: { locale: "en" },
    });

    // Validate router output
    if (!STATE_ALLOW_LIST[ctx.state].includes(routerResult.action)) {
      console.warn("[Router] Invalid action, falling back to deterministic");
      // Fall through to deterministic path
    } else {
      // Execute the tool the router selected
      await executeTool(routerResult, ws, sessionId);
      return;
    }
  }

  // Deterministic fallback (V1-style)
  await handleDeterministicFlow(ws, sessionId, text);
}
```

### Step 4.7 — Router Feature Flag

**Modify: `poc/api/src/config.ts`**

Add `ROUTER_ENABLED` env var (default: `false`). This supports A/B testing (router on vs off).

### Phase 4 Verification

- Run cleaning flow with `ROUTER_ENABLED=false` — confirm identical to Phase 3
- Enable router: confirm it selects `extract_slots` for initial transcript
- Test non-linear dialogue: "make it Thursday instead" during clarification — router should pick `extract_slots` for a slot update
- Test allow-list enforcement: manually return an unauthorized action from LLM, confirm kernel rejects it
- Measure latency overhead: should be < 300ms p95 on turns using router
- Test router timeout: kill the LLM, confirm deterministic fallback fires

---

## Phase 5: Second Service Proving Plug-and-Play

**Goal:** Onboard a tutoring service using only service pack + prompt pack + provider data files. Zero orchestrator code changes.

**Milestone:** M5 — second service onboarded, demo pass.

### Step 5.1 — Create Tutoring Service Pack

**New file: `poc/services/tutoring/service.yaml`**

```yaml
service_id: tutoring
version: 1
workflow_type: booking_slot_fill

slots:
  subject:
    type: enum
    values: [math, science, english, nepali, computer_science]
    required: true
  level:
    type: enum
    values: [primary, secondary, higher_secondary, bachelors]
    required: true
  date:
    type: date
    required: true
  time:
    type: time
    required: true
  duration_hours:
    type: number
    required: true
  location:
    type: string
    required: false

clarification:
  priority_order: [subject, level, date, time, duration_hours, location]
  max_slots_per_turn: 2

matcher:
  id: geo_availability_v1
  params:
    radius_km: 15
    max_results: 3

response_policy:
  default_mode: template
  turn_modes:
    collecting_ack: llm_optional
    clarifying: template
    options_list: template
    confirmation_summary: template_strict
    fallback_repair: llm_optional
    completion: template
  llm_constraints:
    max_chars: 280
    timeout_ms: 900
    temperature: 0.2
```

### Step 5.2 — Create Tutoring Prompt Pack

**New file: `poc/services/tutoring/prompts.en.yaml`**

```yaml
extraction:
  system: |
    You are a booking assistant for tutoring services.
    Extract tutoring booking details from the user's voice transcript.
    Only set fields you are confident about from the transcript.
    Today is {today}.
    Resolve relative dates from today.
  user: |
    Transcript: "{transcript}"{existing_context}
    Extract any tutoring booking details mentioned.
  existing_context_prefix: "\nAlready known: "
  field_questions:
    subject: "What subject do you need a tutor for?"
    level: "What level — primary, secondary, higher secondary, or bachelors?"
    date: "What date would you like the tutoring session?"
    time: "What time works best for you?"
    duration_hours: "How long do you want the session? One hour, two hours?"

selection:
  select_system: |
    You are a tutoring booking assistant. Identify which tutor the user selected.
    Available tutors:
    {provider_list}
    Return the provider_id of the selected tutor, or null if unclear.
  select_user: "User said: \"{transcript}\"\n\nWhich tutor did they select?"
  confirm_system: |
    Determine if the user confirmed their selection.
    Affirmative words: yes, confirm, correct, that's right, go ahead, book it, sure, okay, ok.
  confirm_user: "User said: \"{transcript}\"\n\nDid they confirm the tutoring session?"

template_responses:
  extracting: "Sure, let me find tutoring details from that."
  clarifying_fallback: "I need a few more details. What subject and level are you looking for?"
  no_providers: "Sorry, I couldn't find any available tutors matching your request. Could you try a different date or subject?"
  provider_intro: "I found {count} tutors near you."
  provider_option: "Option {index}: {name}, rated {rating} stars, {distance} kilometres away, available at {time}, {rate} per hour."
  provider_outro: "Which tutor would you like?"
  confirming: "To confirm: {providerName} will tutor {subject} at {level} level at {location} on {date} at {time} for {duration} hours. Total: {total}. Say confirm to book."
  booked: "Your tutoring session is booked! Booking ID {bookingId}. You'll receive a confirmation shortly."
  idle: "I'm ready to help you book a tutor. What subject do you need help with?"
  barge_in: "Go ahead, I'm listening."
  session_limit: "Session limit reached. Starting over."
  already_booked: "Your session is already confirmed!"
  provider_not_found: "I couldn't find that tutor. Please try again."
  provider_retry: "Sorry, I didn't catch that."
  provider_error: "Something went wrong. Let me show the options again."
  confirm_retry: "Please say 'confirm' to complete the booking, or say 'go back' to choose a different tutor."
  currency: "NPR"
  locale: "en-NP"

nlg_responses:
  style: "Conversational, friendly, concise."
  persona: "A friendly booking assistant for tutoring services in Kathmandu."
  forbidden_phrases: ["I'm an AI", "As a language model"]
```

### Step 5.3 — Create Tutoring Provider Data

**New file: `poc/services/tutoring/providers.json`**

10-15 mock tutors with:
- `id`, `name`, `address`, `ward`, `lat`, `lng` (Kathmandu valley)
- `services`: `["math", "science"]` etc.
- `availability`: 5-day schedule of ISO datetime slots
- `hourly_rate`: 300-800 NPR
- `rating`: 4.0-5.0

### Step 5.4 — Add Service Selection to WebSocket Protocol

**Modify: `poc/api/src/ws-handler.ts`**

Add a way to specify the service when creating a session:

```typescript
// Client → Server
{ type: "START_SESSION", serviceId: "tutoring" }
// or include serviceId in TRANSCRIPT messages
{ type: "TRANSCRIPT", sessionId: "s1", serviceId: "tutoring", text: "..." }
```

Default to `cleaning` if no `serviceId` specified (backward compatible).

### Step 5.5 — Verify Zero Code Changes

This is the critical acceptance test. After adding the tutoring service pack files, restart the API and confirm:

1. No TypeScript compilation errors
2. Service pack loader discovers and validates `tutoring` service
3. Full tutoring booking flow works: subject → level → date → time → duration → provider options → confirm → booked
4. No modification to any file in `poc/api/src/kernel/`, `poc/api/src/response/`, `poc/api/src/matcher/`, or `poc/api/src/router/`

### Phase 5 Verification

- Run tutoring flow: "I need a math tutor for secondary level next Monday at 3pm for 2 hours"
- Confirm extraction produces correct slots from tutoring schema
- Confirm matching works with tutoring providers (geo + availability)
- Confirm confirmation template uses tutoring-specific language
- Confirm cleaning flow still works unchanged alongside tutoring

---

## Cross-Cutting Concerns

### Service-ID Routing

The WebSocket protocol needs a mechanism for the client to specify which service they want. Options:

1. **Session-level**: `START_SESSION` message includes `serviceId` — simplest, one service per session
2. **Per-message**: Each `TRANSCRIPT` includes `serviceId` — supports mid-session service switching (over-engineering for V2)

Recommendation: Option 1 for V2.

### Config Validation at Startup

The service-pack loader should fail loudly at startup if:
- `service.yaml` fails Zod validation
- Required prompt file (at least one locale) is missing
- `matcher.id` references an unregistered matcher
- `response_policy.turn_modes` references unknown intent IDs
- `providers.json` is missing or malformed

This prevents runtime surprises from config drift.

### Shared JSON Schema Validation

To prevent config drift between Node and Python (Risk #4 from V2 spec):
- Define a JSON Schema for `service.yaml` in `poc/services/service.schema.json`
- Validate in both Node (via Zod or Ajv) and Python (via jsonschema/Pydantic) at startup
- Both services read from the same `SERVICE_PACK_ROOT` directory

### Error Handling Strategy

| Error Type | Handling |
|---|---|
| Extraction LLM timeout | Return empty `slot_updates`, stay in current state, ask clarification |
| Response LLM timeout | Fall back to template |
| Router LLM timeout | Fall back to deterministic flow |
| Service pack not found | Reject session start with error |
| Matcher returns 0 results | Render `no_providers` template |
| Guardrail validation failure | Fall back to template |

### Logging and Observability

Each turn should log:
- `session_id`, `service_id`, `turn_number`
- `state_before`, `state_after`
- `response_mode` (template / llm / llm_fallback_template)
- `extraction_confidence` map
- `router_action` and `router_reason_code` (when router is enabled)
- `latency_ms` (total, extraction, response_generation, tts)

This supports the A/B evaluation required by acceptance criterion E.

---

## Dependency Summary

### New Node Dependencies

| Package | Purpose | Phase |
|---|---|---|
| `js-yaml` | Parse YAML service pack files | 1 |
| `zod` | Validate service pack schemas at startup | 1 |
| `@langchain/langgraph` | Bounded router (if TS SDK is viable) | 4 |
| `@langchain/core` | LangGraph dependency | 4 |

### New Python Dependencies

| Package | Purpose | Phase |
|---|---|---|
| `jsonschema` | Validate service pack from Python side (optional — Pydantic may suffice) | 2 |
| `langgraph` | If router runs in Python (Option B) | 4 |

---

## Implementation Order and Dependencies

```
Phase 1 ──────────────────────────────────────────────────────────
  1.1 Service pack types          (no deps)
  1.2 Cleaning service pack files (no deps)
  1.3 Service pack loader         (depends on 1.1, 1.2)
  1.4 Rewire Node prompts/matcher (depends on 1.3)
  1.5 Rewire Python prompts       (depends on 1.2)
  1.6 Delete V1 files             (depends on 1.4, 1.5 verified)

Phase 2 ──────────────────────────────────────────────────────────
  2.1 Kernel types                (depends on Phase 1)
  2.2 Workflow states             (no deps)
  2.3 Transition function         (depends on 2.1, 2.2)
  2.4 Refactor session store      (depends on 2.1)
  2.5 Update Python /extract      (depends on Phase 1)
  2.6 Dynamic schema extraction   (depends on 2.5)
  2.7 Update Node AI client       (depends on 2.5)
  2.8 Refactor orchestrator       (depends on 2.3, 2.4, 2.7)

Phase 3 ──────────────────────────────────────────────────────────
  3.1 Response intent type        (depends on Phase 2)
  3.2 Template renderer           (depends on 3.1)
  3.3 LLM responder (Python)      (no deps beyond Phase 1)
  3.4 Response policy engine      (depends on 3.2, 3.3)
  3.5 Response guardrails         (depends on 3.1)
  3.6 Update AI client            (depends on 3.3)
  3.7 Integrate into orchestrator (depends on 3.4, 3.5, 3.6)
  3.8 Delete V1 response files    (depends on 3.7 verified)

Phase 4 ──────────────────────────────────────────────────────────
  4.1 Add LangGraph dependency    (no deps)
  4.2 Tool catalog                (depends on Phase 2)
  4.3 Allow lists                 (depends on 2.2)
  4.4 State graph                 (depends on 4.2, 4.3)
  4.5 Router types                (no deps)
  4.6 Integrate into orchestrator (depends on 4.4)
  4.7 Feature flag                (depends on 4.6)

Phase 5 ──────────────────────────────────────────────────────────
  5.1 Tutoring service.yaml       (no deps beyond Phase 2)
  5.2 Tutoring prompts.en.yaml    (no deps beyond Phase 3)
  5.3 Tutoring providers.json     (no deps)
  5.4 Service selection protocol  (depends on Phase 2)
  5.5 Verify zero code changes    (depends on all above)
```

---

## Risk Checkpoints

After each phase, run these checks before proceeding:

| Phase | Gate |
|---|---|
| 1 | Cleaning flow end-to-end produces identical output. All prompts load from service pack. |
| 2 | Cleaning flow works with dynamic schema extraction. `CleaningBooking` model no longer exists in Python. |
| 3 | Template-only path works. LLM path produces natural text for `llm_optional` turns. Fallback triggers on LLM failure. |
| 4 | Router off = Phase 3 behavior. Router on = correct tool selection. Allow-list blocks unauthorized actions. |
| 5 | Tutoring service onboarded with zero code changes. Both services work simultaneously. |

---

## Estimated File Change Summary

| Category | New Files | Modified Files | Deleted Files |
|---|---|---|---|
| Service packs | 6 (cleaning yaml/json + tutoring yaml/json) | 0 | 3 (V1 prompts + providers) |
| Kernel | 3 (states, transition, types) | 0 | 0 |
| Service pack runtime | 4 (loader, registry, schema, types) | 0 | 0 |
| Response engine | 5 (policy, template, llm, guardrails, intent) | 0 | 2 (V1 response-builder, prompts.ts) |
| Matcher | 3 (registry, geo-availability, types) | 0 | 0 |
| Router | 4 (graph, tools, allow-list, types) | 0 | 0 |
| Orchestrator | 0 | 4 (ws-handler, session-store, ai-client, config) | 1 (V1 state-machine.ts) |
| Python AI | 1 (responder.py) | 4 (main, extractor, models, prompts) | 0 |
| **Total** | **26** | **8** | **6** |