# 🔮 KAHİN (Ben Demiştim!) — Web Tabanlı Gündem, Spor ve Magazin Tahmin Borsası

**Kahin**, kullanıcıların Türkiye gündemi, futbol derbileri, magazin olayları ve ekonomi başlıkları üzerinden tamamen sanal puanlarla **"Evet / Hayır" hissesi alıp sattığı**, dinamik oranlı (AMM) ve sıfır yasal riskli bir sosyal tahmin web platformudur.

---

## 🚀 Temel Değer Önerisi
- **Sabit Oran Yok, Canlı Borsa Var:** Oranları kasa değil, kullanıcıların alım-satım talebi (Automated Market Maker - CPMM) belirler.
- **Sonucu Beklemeden Kâr Al (Cash-Out):** Maç veya olay sonuçlanmadan önce oran yükseldiğinde hisseni havuza geri satıp kârını anında realize edebilirsin.
- **Yasal ve Güvenli (Zero Cash-Out):** Gerçek para ile tahmin puanı satılmaz ve içeriden dışarıya nakit/ödül çıkışı yapılmaz. Tamamen statü, rekabet ve lig sistemi üzerine kuruludur.
- **Anında Erişim & Viral Linkler (Web & PWA):** Uygulama indirme zorunluluğu olmadan X (Twitter) ve WhatsApp üzerinden paylaşılan linklerle saniyeler içinde tahmin katılımları ve canlı oran önizlemeleri (Dynamic OpenGraph).
- **Kanka Ligi & Kanıt Kartı:** Arkadaş gruplarına özel kapalı tahmin ligleri ve düşük ihtimalli tahminleri bilenler için tek tuşla üretilen *"Türkiye'nin %88'i yanıldı, ben bildim!"* sosyal medya paylaşım kartları.

---

## 🛠️ Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Kullanım Amacı |
| :--- | :--- | :--- |
| **Web Frontend** | Next.js (App Router) + Tailwind CSS | SEO uyumlu (SSR), mobil öncelikli (Mobile-First) modern web ve PWA arayüzü |
| **Canlı Grafikler** | TradingView Lightweight Charts | Borsa kalitesinde akıcı, etkileşimli ihtimal grafikleri |
| **Backend API** | Python (FastAPI) | Asenkron REST API ve gerçek zamanlı WebSocket sunucusu |
| **Veritabanı** | PostgreSQL | Kullanıcılar, tahmin havuzları, ligler ve Çift Kayıtlı Muhasebe (Ledger) |
| **Önbellek & Sıralama** | Redis | Milisaniyelik canlı liderlik tablosu (`ZSET`), Pub/Sub ve Distributed Lock |
| **Asenkron Görevler** | Celery + Redis Queue | Sonuçlanan sorularda binlerce kullanıcının puanını arka planda dağıtma |
| **Yönetici Paneli** | Python (Streamlit) | Yeni soru açma, mevcut soruları kilitleme ve sonuçlandırma |

---

## 📂 Monorepo Klasör Yapısı

```text
kahin/
├── README.md                     # Proje genel bakışı ve mimari özet
├── docker-compose.yml            # PostgreSQL ve Redis yerel geliştirme ortamı
├── backend/                      # FastAPI + Celery + PostgreSQL Backend
│   ├── app/
│   │   ├── api/                  # REST ve WebSocket rotaları
│   │   ├── core/                 # AMM algoritması, JWT güvenlik ve config
│   │   ├── models/               # SQLAlchemy veritabanı modelleri
│   │   ├── services/             # Ledger ve Redis Leaderboard servisleri
│   │   └── tasks/                # Celery soru çözümleme (resolution) işçileri
│   ├── Dockerfile
│   └── requirements.txt
├── frontend-web/                 # Next.js (App Router) + Tailwind CSS Web Uygulaması
│   ├── src/
│   │   ├── app/                  # Sayfa rotaları ve Dynamic OG Image üretici
│   │   ├── components/           # MarketCard, TradeWidget, LiveChart bileşenleri
│   │   ├── hooks/                # useWebSocket, useAMMCalculator
│   │   └── lib/                  # API istemcisi ve yardımcı fonksiyonlar
│   ├── public/                   # PWA manifest.json ve ikonlar
│   └── package.json
├── admin-panel/                  # Streamlit Yönetici Paneli (Soru açma ve sonuçlandırma)
│   └── app.py
├── question-bot/                 # (Opsiyonel) RSS ve LLM ile taslak soru üreten Python betiği
│   └── generator.py
└── docs/                         # Detaylı Mimari ve Ürün Dokümantasyonu
    ├── PRD.md                    # Ürün gereksinimleri, yasal sınırlar ve oyunlaştırma
    ├── DATABASE_AND_AMM.md       # PostgreSQL şeması, Redis yapısı ve Python AMM motoru
    ├── API_SPEC.md               # FastAPI REST uç noktaları ve WebSocket sözleşmesi
    ├── WEB_FRONTEND_SPEC.md      # Next.js ekranları, bileşenler ve istemci AMM hesaplayıcı
    ├── ADMIN_PANEL.md            # Streamlit yönetici paneli ve soru sonuçlandırma akışı
    ├── DEPLOYMENT_GUIDE.md       # Vercel, Render, Railway ve Docker ile canlıya alma rehberi
    └── ROADMAP.md                # 4 haftalık adım adım MVP geliştirme takvimi
```

---

## 📚 Dokümantasyon Rehberi

Projeyi geliştirmeye ve canlıya almaya başlamadan önce `docs/` dizinindeki dosyalar şu sırayla incelenmelidir:
1. **`docs/PRD.md`**: Ekonomi kuralları (Kahin Puanı vs. Elmas), yasal sınırlar ve lig sistemi.
2. **`docs/DATABASE_AND_AMM.md`**: PostgreSQL tabloları (`users`, `markets`, `positions`, `ledger_entries`, `market_price_history`, `leagues`, `comments`) ve `PredictionAMM` (Alım & Satım) fiyatlama matematiği.
3. **`docs/API_SPEC.md`**: Backend REST uç noktaları ve canlı WebSocket mesaj formatları.
4. **`docs/WEB_FRONTEND_SPEC.md`**: Next.js sayfa rotaları, UI bileşenleri ve anlık oran önizleme formülü.
5. **`docs/ADMIN_PANEL.md`**: Streamlit üzerinden soru oluşturma ve sonuçlandırma işlemleri.
6. **`docs/DEPLOYMENT_GUIDE.md`**: Vercel + Render, Railway ve bağımsız sunucu (VPS/Caddy) canlı dağıtım adımları.
7. **`docs/ROADMAP.md`**: Faz 1'den Faz 4'e kadar geliştirme sırası (Tamamlandı ✅).

---

## 🌐 Canlıya Alma (Quick Production Deploy)

- **Vercel + Render (Önerilen):** Ön yüzü Vercel'e (`frontend-web/`), arka yüz ve veritabanlarını Render Blueprint (`render.yaml`) ile Render'a tek tıkla yükleyin.
- **Kendi Sunucun (VPS / Ubuntu):** Otomatik Let's Encrypt SSL ve tersine proxy ile tek komutta çalıştırmak için:
  ```bash
  cp .env.production.example .env.production
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
  ```
  Detaylı adımlar için [DEPLOYMENT_GUIDE.md](file:///c:/Users/myeti/Desktop/kahin/kahin/docs/DEPLOYMENT_GUIDE.md) dosyasını inceleyin.
