#!/usr/bin/env bash
set -e

echo "🚀 [Kahin] Veritabanı migrationları çalıştırılıyor..."
alembic upgrade head

echo "🌱 [Kahin] Başlangıç verileri kontrol ediliyor (seed)..."
python -m scripts.seed || echo "Seed adımı tamamlandı veya atlandı."

PORT=${PORT:-8000}
WORKERS=${WEB_CONCURRENCY:-2}

echo "🔥 [Kahin] FastAPI sunucusu $PORT portunda $WORKERS worker ile başlatılıyor..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers "$WORKERS"
