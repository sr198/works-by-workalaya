# Voice-First Intent Engine POC V2: Declarative, Multi-Service, Hybrid NLG

## Goal

Validate that the **ASR → LLM → TTS engine** can drive booking workflows across services with minimal code changes.

Primary success condition for V2:

- New service onboarding should require **service pack + prompts + provider data**, with no orchestrator code changes for services that fit the standard slot-filling workflow.
- System must support **hybrid response generation**:
  - deterministic templates for high-risk transactional turns
  - LLM-generated transcripts for conversational turns where flexibility is useful

## Why V2

V1 proves a cleaning-focused voice flow. It does not yet prove a reusable intent engine because:

- service-specific assumptions leak into code paths
- extraction schemas are domain-bound
- TTS text is mostly static templates

V2 reframes the POC around a declarative runtime contract.

---

## Non-Goals

- Full no-code support for any arbitrary business process
- multi-tenant production hardening (auth, billing, full observability stack)
- replacing current ASR/TTS components

V2 targets a **single workflow family** (slot-filling booking) and makes it extensible by configuration.

---

## V2 Principles

1. **Declarative by default**
All service-specific behavior should come from service packs and prompt packs.

2. **LLM where it adds value, templates where correctness matters**
Use deterministic templates for legally/financially sensitive confirmations.

3. **Shared workflow kernel**
Orchestrator owns generic state transitions, not service semantics.

4. **Schema-first interfaces**
Extractor and responder exchange normalized JSON objects driven by service schema.

5. **Fail safe**
If LLM NLG fails policy checks or times out, fallback to deterministic template immediately.

---

## Reference Topology (unchanged infra, changed contracts)

- Mobile app (ASR input, TTS output, WS transport)
- Node API orchestrator (state machine + policy engine + service-pack runtime)
- Python AI service (schema-driven extraction + optional response NLG)
- vLLM backend
- Kokoro TTS backend

The key change is not services, but runtime responsibilities.

---

## Runtime Architecture

### 1. Workflow Kernel (Node)

Generic state set for slot-filling flows:

- `IDLE`
- `COLLECTING`
- `CLARIFYING`
- `OPTIONS`
- `CONFIRMING`
- `COMPLETED`

Optional extension states allowed via service config only if they map to generic behaviors.

Node responsibilities:

- load active `service_pack`
- manage session slot-store
- call extractor with dynamic schema context
- compute missing slots and next action
- invoke matcher plugin selected by service pack
- build `response_intent`
- run response policy (`template` vs `llm`)
- call TTS

### 2. Extraction Engine (Python)

Python AI service should expose a generic endpoint:

- `POST /extract`
  - input: transcript, existing slot values, service schema, locale, current state
  - output: normalized slot updates, missing required slots, extraction confidence map

Extraction remains Instructor `Mode.JSON` with schema-in-prompt strategy.

### 3. Response Engine (Hybrid)

Response flow:

1. Node builds structured `response_intent`
2. Policy engine selects `template` or `llm`
3. If `template`, render deterministic text from prompt pack
4. If `llm`, call Python `POST /respond` with strict constraints
5. Validate generated text against response guardrails
6. On failure, fallback to template

### 4. Matcher Layer

Service pack selects a matcher by id, for example:

- `geo_availability_v1`
- `skills_only_v1`

Matchers receive normalized slot map and provider dataset.

### 5. Agentic Router Layer (LangGraph, Bounded)

LangGraph is added as a thin orchestration layer above deterministic services.

Scope of LangGraph in V2:

- interpret ambiguous user intent
- pick tool sequence when multiple valid routes exist
- recover from non-linear dialogue (user jumps across steps)
- hand off final decisions to deterministic workflow kernel

Out of scope for LangGraph in V2:

- direct booking writes
- confirmation authority
- payment or policy decisions
- bypassing slot validation or state guards

Execution pattern:

1. Workflow kernel emits current state, slots, and allowed actions
2. LangGraph router selects one allowed tool call (or asks clarification)
3. Tool executes in deterministic service layer
4. Kernel validates output and applies transition
5. Response policy renders template or LLM text

This keeps agent flexibility while preserving transactional correctness.

### 6. Tool Catalog (System Behaviors as Contracts)

Core tools exposed to the router:

- `extract_slots`
- `search_jobs_semantic`
- `filter_jobs_keyword`
- `filter_jobs_geo`
- `check_calendar`
- `rank_providers`
- `select_provider`
- `create_booking`
- `confirm_booking`
- `cancel_booking`
- `ask_clarification`

Tool contract requirements:

- strict JSON schema for input/output
- idempotency key for write tools (`create_booking`, `confirm_booking`, `cancel_booking`)
- deterministic error codes
- audit log entries for every write-side effect

Retriever strategy in V2:

- semantic retrieval for broad recall (`search_jobs_semantic`)
- keyword/attribute filters for precision (`filter_jobs_keyword`)
- geo radius and availability window filtering (`filter_jobs_geo`)
- final candidate ranking in deterministic code (`rank_providers`)

---

## Declarative Service Pack Contract

Each service lives in its own directory and is loaded at runtime.

Suggested layout:

```text
poc/services/
  cleaning/
    service.yaml
    prompts.en.yaml
    prompts.ne.yaml
    providers.json
  tutoring/
    service.yaml
    prompts.en.yaml
    providers.json
```

### `service.yaml` (example shape)

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

---

## Prompt Pack Contract

Prompt packs are language and service aware.

### `prompts.<lang>.yaml` sections

- `extraction`
  - system instructions, normalization rules, date/time grounding
- `selection`
  - option selection + confirmation interpretation
- `template_responses`
  - deterministic templates by intent id
- `nlg_responses`
  - style guides and constraints for LLM response generation

No hardcoded domain language in orchestrator.

---

## Response Intent Contract

Node generates an intermediate object before text generation:

```json
{
  "intent_id": "confirmation_summary",
  "service_id": "cleaning",
  "locale": "en-NP",
  "facts": {
    "provider_name": "Maria's Cleaning",
    "date": "2026-02-24",
    "time": "14:00",
    "duration_hours": 3,
    "total_estimate": 5400,
    "currency": "NPR"
  },
  "required_mentions": ["provider_name", "date", "time", "total_estimate"],
  "mode": "template_strict"
}
```

If mode is `llm_optional`, the responder can generate freely but must pass validation.

---

## Guardrails for LLM-Generated TTS Text

For any LLM response:

- must include all `required_mentions`
- must not contradict known slot values
- must stay within length cap
- must avoid unsupported commitments (no promises outside facts)
- must fallback to template on timeout, parse failure, or validation failure

These checks run before TTS synthesis.

---

## State Machine Policy (Declarative)

State transitions stay code-owned, but transition behavior uses config:

- which slots are required
- which slots can be deferred
- how many clarifications per turn
- which response intent to emit per transition

This keeps logic stable while allowing service variation.

LangGraph router can only invoke actions included in the current state's allow-list from workflow config.

---

## API Contract Changes

### Node → Python `/extract`

Request:

```json
{
  "service_id": "cleaning",
  "locale": "en-NP",
  "state": "CLARIFYING",
  "transcript": "next Tuesday at 2",
  "existing_slots": {"service_type": "deep"},
  "slot_schema": {"date": {"type": "date", "required": true}}
}
```

Response:

```json
{
  "slot_updates": {"date": "2026-02-24", "time": "14:00"},
  "missing_required": ["duration_hours"],
  "confidence": {"date": 0.93, "time": 0.88}
}
```

### Node → Python `/respond` (new)

Request carries `response_intent`, facts, mode, and constraints.
Response returns generated text plus optional rationale metadata.

### Node ↔ LangGraph Router (new internal contract)

Request:

```json
{
  "session_id": "s1",
  "service_id": "cleaning",
  "state": "CLARIFYING",
  "transcript": "make it Thursday instead",
  "slots": {"date": "2026-02-24", "time": "14:00"},
  "allowed_actions": ["extract_slots", "ask_clarification"],
  "tool_context": {"locale": "en-NP"}
}
```

Response:

```json
{
  "action": "extract_slots",
  "args": {"transcript": "make it Thursday instead"},
  "reason_code": "slot_update_request"
}
```

If router output violates `allowed_actions`, kernel rejects and falls back to deterministic clarification prompt.

---

## Migration Plan from V1

### Phase 1: Extract Domain Artifacts

- move cleaning-specific prompts and fields to `poc/services/cleaning/*`
- replace hardcoded prompt loading with service-pack loader
- keep current behavior functionally equivalent

### Phase 2: Generic Slot Store + Extract Contract

- replace `CleaningBooking` usage in Node with `Record<string, unknown>` slots + schema metadata
- update Python extractor endpoint to consume dynamic schema context

### Phase 3: Response Policy Engine

- introduce `response_intent`
- implement template renderer for all intents
- add optional `/respond` LLM path for selected intents
- add validation + fallback

### Phase 4: LangGraph Bounded Router

- add LangGraph router with state-scoped allow-lists
- expose tool catalog with strict schemas
- keep booking writes and confirmation in deterministic services
- add router fallback path on invalid action, timeout, or tool failure

### Phase 5: Second Service Proving Plug-and-Play

- add one non-cleaning service (e.g., tutoring)
- onboard with service pack and prompt pack only
- verify zero orchestrator code changes

---

## Acceptance Criteria

### A. Extensibility

- Add second service via config/prompt/data files only
- No changes to core state machine code for standard slot-fill workflow

### B. Reliability

- Confirmation and completion turns always deterministic (template path)
- LLM generation fallback rate < 5% in happy-path tests

### C. Latency

- template turns remain within V1 latency envelope
- llm-optional turns keep end-to-end response under 2.5s p95 on local setup

### D. Conversation Quality

- llm-optional turns score higher naturalness in internal evaluation
- no factual contradictions in generated TTS for validated sessions

### E. Agentic Layer Value

- at least 30% reduction in clarification dead-ends versus non-agent baseline
- at least 20% reduction in turns for non-linear utterance test set
- zero unauthorized write actions (all blocked by allow-list and validators)
- no increase greater than 300ms p95 on turns that use router planning

---

## Risks and Mitigations

1. **Dynamic schema extraction quality variance**
Mitigation: strict normalization rules + service-level eval sets.

2. **LLM NLG hallucination on spoken responses**
Mitigation: required mention validation + deterministic fallback.

3. **Over-flexible service packs becoming untestable**
Mitigation: supported workflow types registry (`booking_slot_fill_v1` only for V2).

4. **Config drift across Node and Python**
Mitigation: shared JSON schema for service pack validation at startup.

5. **Agent layer complexity without measurable gain**
Mitigation: baseline A/B run (router off vs on) and keep router only if section E targets are met.

---

## Suggested Milestones

- M1: service-pack loader + cleaning migrated
- M2: dynamic extractor contract live
- M3: response policy engine with template + llm_optional
- M4: LangGraph bounded router + tool contracts live
- M5: second service onboarded, demo pass

---

## Decision Log (V2)

- Declarative architecture is the default target from V2 onward.
- Hybrid NLG is mandatory: template-first with selective LLM generation.
- LangGraph is used as a bounded router, not as source of truth for business rules.
- POC success is measured by both booking completion and service plug-in ability.
