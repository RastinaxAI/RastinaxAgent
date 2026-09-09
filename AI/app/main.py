import sys
from pathlib import Path

# اضافه کردن مسیر Root پروژه برای جلوگیری از ModuleNotFoundError در اسپایدر
sys.path.append(str(Path(__file__).resolve().parent.parent))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.agent.agent import run_agent_stream, get_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        get_client()
        print("--- AI Client initialized successfully (Warmup done) ---")
    except Exception as e:
        print(f"Warmup warning: {e}")
    yield

app = FastAPI(
    title="Rastinax Marketing AI Agent API",
    version="1.0.0",
    lifespan=lifespan
)

class ChatRequest(BaseModel):
    user_input: str
    chat_history: Optional[List[Dict[str, Any]]] = None

@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        return StreamingResponse(
            run_agent_stream(
                user_input=request.user_input,
                chat_history=request.chat_history
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))