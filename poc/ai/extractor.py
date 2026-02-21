"""
Instructor-based booking extraction using Mode.JSON.

Uses constrained JSON decoding rather than tool-calling to avoid vLLM GPTQ
nested $defs bug. Retries and model config come from config.py.
"""
import instructor
from openai import OpenAI
from datetime import date
from typing import Optional

from config import VLLM_BASE_URL, VLLM_API_KEY, LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_RETRIES
from models import CleaningBooking, ExtractionResult
from prompts import extraction as P

_client: Optional[instructor.Instructor] = None


def get_client() -> instructor.Instructor:
    global _client
    if _client is None:
        raw = OpenAI(base_url=VLLM_BASE_URL, api_key=VLLM_API_KEY)
        _client = instructor.from_openai(raw, mode=instructor.Mode.JSON)
    return _client


def extract_booking(transcript: str, existing: Optional[dict] = None) -> ExtractionResult:
    """
    Extract or update CleaningBooking fields from a voice transcript.
    Merges with any existing partial booking.
    """
    today = date.today().strftime("%Y-%m-%d, %A")

    existing_context = ""
    if existing:
        existing_context = P.existing_context_prefix + str(existing)

    client = get_client()
    extracted: CleaningBooking = client.chat.completions.create(
        model=LLM_MODEL,
        response_model=CleaningBooking,
        messages=[
            {"role": "system", "content": P.system(today)},
            {"role": "user",   "content": P.user(transcript, existing_context)},
        ],
        temperature=LLM_TEMPERATURE,
        max_retries=LLM_MAX_RETRIES,
    )

    # Merge with existing booking (existing values are overwritten by new extraction)
    merged: dict = {}
    if existing:
        merged.update({k: v for k, v in existing.items() if v is not None})
    merged.update(extracted.model_dump(exclude_none=True))

    final = CleaningBooking(**merged)

    # Determine missing required fields
    missing = [f for f in P.required_fields if getattr(final, f) is None]

    clarification: Optional[str] = None
    if missing:
        fields_to_ask = missing[:P.max_clarification_fields]
        questions = [P.field_questions[f] for f in fields_to_ask if f in P.field_questions]
        clarification = P.clarification_joiner.join(questions)

    return ExtractionResult(
        booking=final,
        missing_fields=missing,
        clarification_prompt=clarification,
    )
