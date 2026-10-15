#!/usr/bin/env bash
set -e

echo "⏳ [Kahin] Veritabanı bağlantısı bekleniyor..."
python -c "
import asyncio, sys
from app.db.session import engine
from sqlalchemy import text

async def wait_db():
    for i in range(30):
        try:
            async with engine.connect() as conn:
                await conn.execute(text('SELECT 1'))
                print('✅ [Kahin] Veritabanı bağlantısı başarılı!')
                return
        except Exception as e:
            print(f'⏳ Veritabanı bekleniyor ({i+1}/30)...')
            await asyncio.sleep(2)
    print('❌ Veritabanına ulaşılamadı.')
    sys.exit(1)

asyncio.run(wait_db())
"

echo "🚀 [Kahin] Veritabanı migrationları çalıştırılıyor..."
alembic upgrade head

echo "🌱 [Kahin] Başlangıç verileri kontrol ediliyor (seed)..."
python -m scripts.seed || echo "Seed adımı tamamlandı veya atlandı."

PORT=${PORT:-8000}
WORKERS=${WEB_CONCURRENCY:-1}

echo "🔥 [Kahin] FastAPI sunucusu $PORT portunda $WORKERS worker ile başlatılıyor..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers "$WORKERS"
