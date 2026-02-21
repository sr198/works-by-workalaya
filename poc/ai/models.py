"""
Flat Pydantic models for booking extraction.

IMPORTANT: Keep all models flat — no nested sub-models with $defs.
vLLM GPTQ + nested Pydantic $defs via tool parameters is broken (issue #15035).
We use instructor Mode.JSON which puts schema in the prompt and uses constrained
decoding, so nested models work here — but we keep them flat anyway for clarity.

Date context ("today is X") belongs in the extraction system prompt (prompts.yaml),
not in field descriptions, so these stay format-only.
"""
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class ServiceType(str, Enum):
    standard = "standard"
    deep = "deep"
    move_in_out = "move_in_out"


class CleaningBooking(BaseModel):
    """Extracted booking details from voice transcript. All fields optional — only set
    when confidently extracted from the transcript."""

    service_type: Optional[ServiceType] = Field(
        None,
        description=(
            "Type of cleaning service. "
            "'standard' for regular cleaning, "
            "'deep' for thorough/deep clean, "
            "'move_in_out' for moving cleaning."
        ),
    )
    date: Optional[str] = Field(
        None,
        description="Requested date in YYYY-MM-DD format. Resolve relative dates from today.",
    )
    time: Optional[str] = Field(
        None,
        description="Requested start time in HH:MM 24-hour format. '2pm' = '14:00', 'morning' = '09:00'.",
    )
    duration_hours: Optional[float] = Field(
        None,
        description="Duration of cleaning in hours as a decimal. '3 hours' = 3.0, 'half day' = 4.0.",
    )
    location: Optional[str] = Field(
        None,
        description="Property address or area to be cleaned.",
    )


class ExtractionResult(BaseModel):
    """Result from /extract endpoint."""
    booking: CleaningBooking
    missing_fields: List[str] = Field(
        default_factory=list,
        description="List of field names that are still missing and required for booking.",
    )
    clarification_prompt: Optional[str] = Field(
        None,
        description="Natural language prompt to ask user for missing fields.",
    )


class ProviderSelectionResult(BaseModel):
    """Result from /select endpoint."""
    provider_id: Optional[str] = Field(
        None,
        description="ID of the selected provider, or null if not clearly selected.",
    )
    confirmed: bool = Field(
        False,
        description="True if the user confirmed an existing selection (e.g., 'yes', 'confirm', 'that one').",
    )
