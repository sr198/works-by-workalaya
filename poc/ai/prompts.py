"""
Loads prompts.yaml and exposes typed accessors.

The YAML is parsed once at import time. If PROMPTS_FILE env var points to a
different file it will be loaded instead — useful for A/B testing prompts
without redeploying.
"""
from __future__ import annotations

import yaml
from pathlib import Path
from typing import Any

from config import PROMPTS_FILE


def _load() -> dict[str, Any]:
    path = Path(PROMPTS_FILE)
    if not path.exists():
        raise FileNotFoundError(f"Prompts file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


_data: dict[str, Any] = _load()


# ── Extraction ────────────────────────────────────────────────────────────────

class ExtractionPrompts:
    _e: dict[str, Any] = _data["extraction"]

    required_fields: list[str] = _e["required_fields"]
    field_questions: dict[str, str] = _e["field_questions"]
    clarification_joiner: str = _e["clarification_joiner"]
    max_clarification_fields: int = _e["max_clarification_fields"]
    existing_context_prefix: str = _e["existing_context_prefix"]
    _system_template: str = _e["system"]
    _user_template: str = _e["user"]

    @classmethod
    def system(cls, today: str) -> str:
        return cls._system_template.format(today=today).strip()

    @classmethod
    def user(cls, transcript: str, existing_context: str = "") -> str:
        return cls._user_template.format(
            transcript=transcript,
            existing_context=existing_context,
        ).strip()


# ── Selection ─────────────────────────────────────────────────────────────────

class SelectionPrompts:
    _s: dict[str, Any] = _data["selection"]

    _select_system_template: str = _s["select_system"]
    _select_user_template: str = _s["select_user"]
    _confirm_system_template: str = _s["confirm_system"]
    _confirm_user_template: str = _s["confirm_user"]

    @classmethod
    def select_system(cls, provider_list: str) -> str:
        return cls._select_system_template.format(provider_list=provider_list).strip()

    @classmethod
    def select_user(cls, transcript: str) -> str:
        return cls._select_user_template.format(transcript=transcript).strip()

    @classmethod
    def confirm_system(cls) -> str:
        return cls._confirm_system_template.strip()

    @classmethod
    def confirm_user(cls, transcript: str) -> str:
        return cls._confirm_user_template.format(transcript=transcript).strip()


extraction = ExtractionPrompts()
selection = SelectionPrompts()
