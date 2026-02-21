## Voice-First Cleaning Booking Platform — POC Summary

### Objective

Build a native mobile proof-of-concept that demonstrates a fully voice-driven, bounded conversational booking flow from user request to confirmed job.

The POC validates that:

* A user can speak a request.
* The system can extract structured job details.
* The system can search and return top matching providers.
* The user can select a provider via voice.
* The job can be confirmed and recorded.

This is a transactional voice system, not a chatbot.

---

## Scope of the POC

### 1. Provider Dataset

* Static list of 20–30 providers.
* Each provider includes:

  * Services offered (cleaning only)
  * Geographic region (lat/lng + ward)
  * Rating
  * Predefined availability slots
* No onboarding UI.
* No dynamic edits.

This dataset is seeded for testing matching logic.

---

### 2. Voice-Driven Client Interaction

The client flow must support:

1. User speaks:

   > “I need someone tomorrow morning for two hours cleaning.”

2. System:

   * Converts voice to text.
   * Extracts structured intent.
   * Detects missing information if any.
   * Asks bounded clarification if needed.

3. System:

   * Searches available providers.
   * Returns top 3 matches.
   * Reads them aloud.
   * Displays them visually in the app.

4. User:

   * Selects provider via voice (number or name).

5. System:

   * Confirms selection via voice.
   * On confirmation, creates a job record.
   * Announces booking completion.

This must complete in a small number of turns (≤ 5–6).

---

### 3. Bounded Conversational Model

Conversation is strictly state-driven.

The system supports only:

* Service extraction
* Date extraction
* Time extraction
* Duration extraction
* Provider selection
* Booking confirmation

No free-form conversation.
No topic switching.
No multi-service requests.

The model is used only for:

* Intent extraction
* Selection extraction
* Clarification detection

Conversation control remains deterministic and backend-driven.

---

### 4. Matching and Search

The POC includes:

* Service filtering (cleaning only)
* Geographic radius filtering
* Availability overlap filtering
* Rating-based sorting
* Return top 3 providers only

Similarity search can be included at a basic level (service description embeddings), but the primary goal is functional matching, not advanced ranking.

---

### 5. Streaming Voice Experience

The system supports:

* Real-time or near real-time speech recognition.
* Live transcript feedback.
* Voice playback of system responses.
* Interruptible TTS playback when user speaks.

The experience must feel conversational, not form-based.

---

### 6. Booking Creation

When confirmed:

* A job record is created.
* Job includes:

  * Client ID
  * Provider ID
  * Service type
  * Date
  * Start time
  * Duration
  * StatusI am already getting started on Works by Workalaya's foundational platform. Before I go too deep and implment a full-fledged enterprise ready software -  I need to build a POC. Here's my POC needs:

Voice-First Cleaning Booking Platform — POC Summary
Objective
Build a native mobile proof-of-concept that demonstrates a fully voice-driven, bounded conversational booking flow from user request to confirmed job.
The POC validates that:
* A user can speak a request.
* The system can extract structured job details.
* The system can search and return top matching providers.
* The user can select a provider via voice.
* The job can be confirmed and recorded.
This is a transactional voice system, not a chatbot.
Scope of the POC
1. Provider Dataset
* Static list of 20–30 providers.
* Each provider includes:
   * Services offered (cleaning only)
   * Geographic region (lat/lng + ward)
   * Rating
   * Predefined availability slots
* No onboarding UI.
* No dynamic edits.
This dataset is seeded for testing matching logic.
2. Voice-Driven Client Interaction
The client flow must support:
1. User speaks:
“I need someone tomorrow morning for two hours cleaning.”
2. System:
   * Converts voice to text.
   * Extracts structured intent.
   * Detects missing information if any.
   * Asks bounded clarification if needed.
3. System:
   * Searches available providers.
   * Returns top 3 matches.
   * Reads them aloud.
   * Displays them visually in the app.
4. User:
   * Selects provider via voice (number or name).
5. System:
   * Confirms selection via voice.
   * On confirmation, creates a job record.
   * Announces booking completion.
This must complete in a small number of turns (≤ 5–6).
3. Bounded Conversational Model
Conversation is strictly state-driven.
The system supports only:
* Service extraction
* Date extraction
* Time extraction
* Duration extraction
* Provider selection
* Booking confirmation
No free-form conversation. No topic switching. No multi-service requests.
The model is used only for:
* Intent extraction
* Selection extraction
* Clarification detection
Conversation control remains deterministic and backend-driven.
4. Matching and Search
The POC includes:
* Service filtering (cleaning only)
* Geographic radius filtering
* Availability overlap filtering
* Rating-based sorting
* Return top 3 providers only
Similarity search can be included at a basic level (service description embeddings), but the primary goal is functional matching, not advanced ranking.
5. Streaming Voice Experience
The system supports:
* Real-time or near real-time speech recognition.
* Live transcript feedback.
* Voice playback of system responses.
* Interruptible TTS playback when user speaks.
The experience must feel conversational, not form-based.
6. Booking Creation
When confirmed:
* A job record is created.
* Job includes:
   * Client ID
   * Provider ID
   * Service type
   * Date
   * Start time
   * Duration
   * Status
Provider notification can be simulated for the POC.
No payment integration. No dispute handling. No insurance logic.
7. Offline Handling (Basic)
* Graceful retry if network drops.
* No full offline booking engine.
* Session state preserved server-side.
Explicitly Out of Scope
* Worker training modules
* Insurance workflows
* Payment gateways
* Real provider app
* Multi-service support
* Multi-language support
* Fraud prevention
* Advanced AI ranking
* Multi-region scaling
What This POC Demonstrates
1. Feasibility of bounded, voice-first transactional UX.
2. Reliability of SLM-based structured extraction.
3. Viability of voice-based provider selection.
4. End-to-end conversational booking under controlled constraints.
Final Definition
The POC is:
A native mobile, streaming voice-driven, state-controlled booking engine for cleaning services with structured provider matching and voice-based selection.
Nothing more. Nothing less.
Build that.

Do a bounded research and create a technical plan/design to get the POC rolled out right away. All models will be hosted locally - I use vLLM to run a model like Qwen (quantized 4bits) already - for LLM interaction may be we can use Pydantic AI but I will let you research. This wont be too big of a research work - so focus on functional end-product that we can implement right away. Choose practical and functional platforms/frameworks

Provider notification can be simulated for the POC.

No payment integration.
No dispute handling.
No insurance logic.

---

### 7. Offline Handling (Basic)

* Graceful retry if network drops.
* No full offline booking engine.
* Session state preserved server-side.

---

## Explicitly Out of Scope

* Worker training modules
* Insurance workflows
* Payment gateways
* Real provider app
* Multi-service support
* Multi-language support
* Fraud prevention
* Advanced AI ranking
* Multi-region scaling

---

## What This POC Demonstrates

1. Feasibility of bounded, voice-first transactional UX.
2. Reliability of SLM-based structured extraction.
3. Viability of voice-based provider selection.
4. End-to-end conversational booking under controlled constraints.

---

## Final Definition

The POC is:

> A native mobile, streaming voice-driven, state-controlled booking engine for cleaning services with structured provider matching and voice-based selection.

Nothing more.
Nothing less.

Build that.
