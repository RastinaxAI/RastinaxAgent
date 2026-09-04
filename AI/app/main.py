import logging
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.agent.agent_service import (
    AgentConfigurationError,
    AgentServiceError,
    run_agent,
)

logger = logging.getLogger(__name__)
app = FastAPI(
    title="Rastinax Marketing AI Agent API",
    version="1.0.0",
)

class ChatRequest(BaseModel):
    user_input: str = Field(min_length=1, max_length=10000)
    chat_history: Optional[List[Dict[str, Any]]] = None

class ChatResponse(BaseModel):
    response: str
    chat_history: List[Dict[str, Any]]

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/v1/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    try:
        response_text, updated_history = run_agent(
            user_input=request.user_input,
            chat_history=request.chat_history
        )
        return ChatResponse(response=response_text, chat_history=updated_history)
    except AgentConfigurationError as exc:
        logger.error("AI Agent is not configured: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="AI Agent is not configured.",
        ) from exc
    except AgentServiceError as exc:
        logger.warning("AI Agent request failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="AI Agent could not produce a response.",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected AI Agent error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Unexpected AI Agent error.",
        ) from exc
