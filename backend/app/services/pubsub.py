import json
import logging
from decimal import Decimal

import redis.asyncio as aioredis

from app.core.config import settings

log = logging.getLogger("kahin.pubsub")

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def market_channel(market_id) -> str:
    return f"channel:market:{market_id}"


async def publish_price_tick(
    market_id, slug: str, yes_prob: Decimal, no_prob: Decimal, volume_kp: Decimal, last_trade_side: str, timestamp: str
) -> None:
    """Redis kapalıysa uygulama çökmesin: best-effort yayın."""
    payload = {
        "event": "PRICE_TICK",
        "market_id": str(market_id),
        "slug": slug,
        "yes_prob": float(yes_prob),
        "no_prob": float(no_prob),
        "volume_kp": float(volume_kp),
        "last_trade_side": last_trade_side,
        "timestamp": timestamp,
    }
    try:
        r = get_redis()
        msg = json.dumps(payload)
        await r.publish(market_channel(market_id), msg)
        await r.publish("channel:markets:all", msg)
    except Exception as exc:  # noqa: BLE001
        log.warning("PRICE_TICK yayınlanamadı: %s", exc)
