import asyncio
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.services.pubsub import get_redis

log = logging.getLogger("kahin.ws")

app = FastAPI(title="Kahin API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}


@app.websocket("/ws/markets")
async def websocket_markets(websocket: WebSocket):
    await websocket.accept()
    pubsub = None
    try:
        r = get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe("channel:markets:all")

        async def redis_reader():
            try:
                async for message in pubsub.listen():
                    if message and message.get("type") == "message":
                        data = message.get("data")
                        await websocket.send_text(data)
            except asyncio.CancelledError:
                pass
            except Exception as e:  # noqa: BLE001
                log.debug("Redis reader stopped: %s", e)

        reader_task = asyncio.create_task(redis_reader())
        try:
            while True:
                msg = await websocket.receive_text()
                if msg == "ping":
                    await websocket.send_text(json.dumps({"event": "PONG"}))
        finally:
            reader_task.cancel()
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.warning("WebSocket error: %s", exc)
    finally:
        if pubsub is not None:
            try:
                await pubsub.unsubscribe("channel:markets:all")
                await pubsub.close()
            except Exception:
                pass
