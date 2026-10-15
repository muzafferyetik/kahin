# 🗺️ 4 Haftalık Web MVP Geliştirme Yol Haritası

## Faz 1: Çekirdek Backend ve AMM Motoru (1. Hafta)
- [x] Docker Compose ile PostgreSQL ve Redis ortamının ayağa kaldırılması.
- [x] SQLAlchemy modellerinin (`users`, `markets`, `positions`, `ledger_entries`, `market_price_history`, `leagues`, `comments`) oluşturulması.
- [x] `PredictionAMM` (CPMM) fiyatlama sınıfının (`buy_shares` ve `sell_shares`) birim testleriyle birlikte yazılması.
- [x] FastAPI üzerinde JWT kimlik doğrulama ve satır kilitli (`SELECT ... FOR UPDATE`) `/api/v1/trade/buy` ve `/api/v1/trade/sell` uç noktalarının tamamlanması.

## Faz 2: Next.js Web Arayüzü ve Canlı Borsa Ekranı (2. Hafta)
- [x] Next.js (App Router) + Tailwind CSS kurulumu, koyu tema (Dark Mode) borsa tasarımının yapılması.
- [x] Ana Sayfa (`/`): Kategori filtreli soru kartları (`MarketCard`) ve hızlı Evet/Hayır alım pencereleri.
- [x] Soru Detay Sayfası (`/m/[slug]`): `lightweight-charts` ile canlı ihtimal grafiği ve WebSocket bağlantısı.
- [x] Alım-Satım Kutusu (`TradeWidget`): `useAMMCalculator` (`calculateBuyPreview` ve `calculateSellPreview`) ile kaydırıcıyı oynattıkça anlık getiri ve oran değişimi önizlemesi.

## Faz 3: Yönetici Paneli, Soru Çözümleme ve Liderlik Tablosu (3. Hafta)
- [x] **Streamlit** yönetici panelinin hazırlanması (Yeni soru ekleme, kilitleme ve sonuçlandırma).
- [x] Soru sonuçlandığında kazanan hisseleri `1 Hisse = 1 KP` üzerinden dağıtan ve Keskinlik Skorunu güncelleyen çözümleme akışının yazılması.
- [x] Redis `ZSET` tabanlı canlı Liderlik Tablosu (`/siralama`) sayfasının web arayüzüne bağlanması.
- [x] Sadece hisse sahiplerinin yazabildiği rozetli "Kulis Yorumları" modülü.

## Faz 4: Viral Büyüme Araçları, PWA ve Canlıya Alma (4. Hafta)
- [x] WhatsApp ve X paylaşımları için **Dinamik OpenGraph (`/api/og`)** kart üreticisinin yazılması.
- [x] "Kanka Ligi" (davet linkiyle özel arkadaş grubu kurma, grup içi özel soru açma ve sonuçlandırma).
- [x] "Ben Demiştim!" Kanıt Kartı görsel indirme/paylaşma modülü (`ProofCardModal`) ve PWA (`manifest.json` + ikonlar) ayarları.
- [x] Canlı ortam ve yerel ortam doğrulaması (44/44 backend testi, 0 hatalı Next.js 16 derlemesi).
