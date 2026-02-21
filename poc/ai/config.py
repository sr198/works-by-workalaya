"""
Runtime configuration for the AI service.

All values come from environment variables; a .env file is loaded automatically
via python-dotenv if present. Defaults are suitable for local development.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the ai/ directory (where uvicorn is invoked)
load_dotenv(Path(__file__).parent / ".env")


def _int(key: str, default: int) -> int:
    return int(os.environ.get(key, default))


def _float(key: str, default: float) -> float:
    return float(os.environ.get(key, default))


def _str(key: str, default: str) -> str:
    return os.environ.get(key, default)


# ── LLM backend ──────────────────────────────────────────────────────────────
VLLM_BASE_URL: str = _str("VLLM_BASE_URL", "http://localhost:8080/v1")
VLLM_API_KEY: str = _str("VLLM_API_KEY", "not-required")
LLM_MODEL: str = _str("LLM_MODEL", "Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4")
LLM_TEMPERATURE: float = _float("LLM_TEMPERATURE", 0.1)
LLM_MAX_RETRIES: int = _int("LLM_MAX_RETRIES", 2)

# ── Prompts file ──────────────────────────────────────────────────────────────
PROMPTS_FILE: str = _str(
    "PROMPTS_FILE",
    str(Path(__file__).parent / "prompts.yaml"),
)
