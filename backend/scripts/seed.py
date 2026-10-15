"""
Yerel geliştirme verisi: bir admin kullanıcı ve örnek sorular.
Kullanım (backend/ klasöründen):  python -m scripts.seed
"""
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.api.v1.admin import slugify
from app.core.amm import PredictionAMM
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Market, MarketPriceHistory, User
from app.services.ledger import apply_kp_change

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@kahin.local"
ADMIN_PASSWORD = "admin12345"  # yalnızca yerel geliştirme için!

MARKETS = [
    ("Bu akşamki Galatasaray - Fenerbahçe derbisinde kırmızı kart çıkar mı?", "FUTBOL",
     "Maç sonunda (uzatmalar dahil) en az bir kırmızı kart gösterilirse EVET.", timedelta(hours=6)),
    ("Galatasaray bu sezon şampiyon olur mu?", "FUTBOL",
     "Sezon sonu resmi puan durumunda 1. sırada biterse EVET.", timedelta(days=60)),
    ("TCMB Ekim toplantısında politika faizini düşürür mü?", "EKONOMI",
     "TCMB'nin resmi duyurusunda politika faizi düşürülürse EVET.", timedelta(days=5)),
    ("Dolar/TL hafta sonunu bugünkü kurun üzerinde kapatır mı?", "EKONOMI",
     "Cuma günü TCMB gösterge kuru, bugünkü gösterge kurdan yüksekse EVET.", timedelta(days=3)),
    ("Ünlü şarkıcının yeni albümü bu ay yayımlanır mı?", "MAGAZIN",
     "Resmi dijital platformlarda albüm ay sonuna kadar yayımlanırsa EVET.", timedelta(days=20)),
    ("Bu hafta İstanbul'da kar yağar mı?", "GUNDEM",
     "Meteoroloji kayıtlarına göre İstanbul'da ölçülebilir kar yağarsa EVET.", timedelta(days=7)),
]


async def main() -> None:
    async with SessionLocal() as db:
        admin = (await db.execute(select(User).where(User.username == ADMIN_USERNAME))).scalar_one_or_none()
        if admin is None:
            admin = User(
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                kp_balance=Decimal("0.00"),
                is_admin=True,
            )
            db.add(admin)
            await db.flush()
            await apply_kp_change(db, admin, settings.initial_grant_kp, "INITIAL_GRANT")
            print(f"Admin oluşturuldu: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")

        created = 0
        probs = PredictionAMM(Decimal("1000"), Decimal("1000")).get_probabilities()
        for title, category, criteria, closes_in in MARKETS:
            slug = slugify(title)
            if (await db.execute(select(Market.id).where(Market.slug == slug))).first():
                continue
            m = Market(
                slug=slug, title=title, category=category, resolution_criteria=criteria,
                closes_at=datetime.now(timezone.utc) + closes_in, created_by=admin.id,
            )
            db.add(m)
            await db.flush()
            db.add(MarketPriceHistory(market_id=m.id, yes_prob=probs["yes_prob"],
                                      no_prob=probs["no_prob"], volume_kp=Decimal("0")))
            created += 1
        await db.commit()
        print(f"{created} yeni soru eklendi.")


if __name__ == "__main__":
    asyncio.run(main())
