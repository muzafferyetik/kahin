from fastapi import APIRouter

from app.api.v1 import admin, auth, leaderboard, leagues, markets, trade, wallet

api_router = APIRouter(prefix="/api/v1")
for r in (auth.router, wallet.router, markets.router, trade.router, admin.router, leaderboard.router, leagues.router):
    api_router.include_router(r)
