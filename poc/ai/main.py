"""
Python AI service — FastAPI + Instructor

Endpoints:
  POST /extract   — extract CleaningBooking from transcript
  POST /select    — extract provider selection from transcript
  GET  /health    — liveness check
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from models import ExtractionResult, ProviderSelectionResult
from extractor import extract_booking
from selector import select_provider

app = FastAPI(title="Voice Booking AI Service", version="0.1.0")


class ExtractRequest(BaseModel):
    transcript: str
    existing_booking: Optional[dict] = None


class SelectRequest(BaseModel):
    transcript: str
    providers: List[dict]
    awaiting_confirmation: bool = False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract", response_model=ExtractionResult)
def extract(req: ExtractRequest):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="transcript is required")
    try:
        return extract_booking(req.transcript, req.existing_booking)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/select", response_model=ProviderSelectionResult)
def select(req: SelectRequest):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="transcript is required")
    try:
        return select_provider(req.transcript, req.providers, req.awaiting_confirmation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
