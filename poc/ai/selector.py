"""
Extract provider selection from user voice transcript.

Handles ordinal ("first one", "number 2"), name ("Maria's"), and
confirmation ("yes", "confirm", "that one", "go ahead").
"""
import instructor
from openai import OpenAI
from typing import List, Optional

from config import VLLM_BASE_URL, VLLM_API_KEY, LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_RETRIES
from models import ProviderSelectionResult
from prompts import selection as P

_client: Optional[instructor.Instructor] = None


def get_client() -> instructor.Instructor:
    global _client
    if _client is None:
        raw = OpenAI(base_url=VLLM_BASE_URL, api_key=VLLM_API_KEY)
        _client = instructor.from_openai(raw, mode=instructor.Mode.JSON)
    return _client


def select_provider(
    transcript: str,
    providers: List[dict],
    awaiting_confirmation: bool = False,
) -> ProviderSelectionResult:
    """
    Extract which provider the user selected from the transcript.

    providers: list of dicts with at least {id, name} fields.
    awaiting_confirmation: if True, treat affirmative responses as confirmed=True.
    """
    if awaiting_confirmation:
        system_msg = P.confirm_system()
        user_msg = P.confirm_user(transcript)
    else:
        provider_list = "\n".join(
            f"{i + 1}. {p['name']} (id: {p['id']})"
            for i, p in enumerate(providers)
        )
        system_msg = P.select_system(provider_list)
        user_msg = P.select_user(transcript)

    client = get_client()
    return client.chat.completions.create(
        model=LLM_MODEL,
        response_model=ProviderSelectionResult,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": user_msg},
        ],
        temperature=LLM_TEMPERATURE,
        max_retries=LLM_MAX_RETRIES,
    )
