# Faz 1 — Çekirdek Backend ve AMM Motoru (Tamamlandı ✅)

- [x] Altyapı: docker-compose, .env.example, .gitignore, port çakışması çözümü (5433, 6380, 8001)
- [x] Backend iskeleti: requirements, Dockerfile, config, db session
- [x] SQLAlchemy modelleri (8 tablo: users, leagues, league_members, markets, comments, ledger_entries, market_price_history, positions)
- [x] `PredictionAMM` (core/amm.py - 50 basamaklı hassasiyetle tam tersinir CPMM motoru)
- [x] Güvenlik: bcrypt + JWT (32+ karakter güvenli anahtar) + bağımlılıklar
- [x] Servisler: ledger (tek merkez muhasebe), trading (SELECT FOR UPDATE + populate_existing), portfolio, pubsub
- [x] API: auth, wallet, markets, trade, admin
- [x] Alembic ilk migration (pgcrypto + 8 tablo + check constraints + indeksler)
- [x] Testler: AMM, trade API, eşzamanlılık (deadlock & overdraw korumalı), wallet (37/37 başarılı)
- [x] Seed script (admin + 6 örnek soru, idempotent)
- [x] Doğrulama (Docker PostgreSQL + Redis, pytest 37/37, live uvicorn HTTP smoke test)
- [x] ROADMAP.md Faz 1 işaretleme, API_SPEC.md satış örneği düzeltmesi

---

# Faz 2 — Next.js Web Arayüzü ve Canlı Borsa Ekranı (Tamamlandı ✅)

- [x] Next.js (App Router) + Tailwind CSS kurulumu, Koyu Tema (Dark Mode) borsa teması
- [x] Ana Sayfa (`/`): Kategori filtreli soru kartları (`MarketCard`), dinamik oran çubukları ve hızlı Evet/Hayır alım pencereleri
- [x] Soru Detay Sayfası (`/m/[slug]`): TradingView `lightweight-charts` ile canlı ihtimal grafiği ve WebSocket
- [x] Alım-Satım Kutusu (`TradeWidget`): `useAMMCalculator` ile kaydırıcı oynatıldıkça canlı getiri önizlemesi ve erken hisse bozdurma (Cash-Out)
- [x] Backend WebSocket uç noktası (`/ws/markets`) ve istemci `useMarketWebSocket` entegrasyonu
- [x] Kulis Yorumları (`CommentSection`): 50 KP hisse şartı ve kullanıcı pozisyonu rozeti
- [x] Mobil alt bar (`MobileNav`) ve `AuthModal` (1.000 KP kayıt hibesi)
- [x] `npm run build` ile üretim derlemesi (0 hata, tam TypeScript uyumu)

---

# Faz 3 — Yönetici Paneli, Soru Çözümleme ve Liderlik Tablosu (Sıradaki)

- [ ] **Streamlit** yönetici panelinin hazırlanması (`admin-panel/app.py`: Yeni soru ekleme, kilitleme ve sonuçlandırma)
- [ ] Soru sonuçlandığında kazanan hisseleri `1 Hisse = 1 KP` üzerinden dağıtan ve Keskinlik Skorunu güncelleyen çözümleme servisi / arka plan akışı
- [ ] Redis `ZSET` tabanlı canlı Liderlik Tablosu (`/siralama` sayfası ve `/api/v1/leaderboard` uç noktası)
- [ ] Kulis Yorumları API uç noktası (`POST /api/v1/markets/{id}/comments`)
