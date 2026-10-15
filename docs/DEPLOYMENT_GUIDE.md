# 🚀 Kahin — Üretim Ortamına Dağıtım Rehberi (Production Deployment Guide)

Bu rehber, Türkiye odaklı sosyal tahmin pazarı **Kahin** platformunu modern bulut sağlayıcılarına (Vercel, Render, Railway) veya kendi bağımsız sunucunuza (VPS/Ubuntu) sıfır kesintiyle canlıya almanızı sağlayan eksiksiz yol haritasıdır.

---

## 📌 Mimari Bileşenler

| Katman | Teknoloji | Görevi | Önerilen Dağıtım Yeri |
| :--- | :--- | :--- | :--- |
| **Ön Yüz (Web)** | Next.js 16 (App Router, Standalone) | Kullanıcı arayüzü, canlı grafikler, PWA, Dynamic OG | **Vercel** veya Docker |
| **Arka Yüz (API)** | FastAPI + Python 3.13 + Uvicorn | 50 basamaklı CPMM AMM motoru, REST & WebSocket | **Render** / **Railway** / VPS |
| **Yönetici Paneli** | Streamlit | Piyasa açma, acil kilit, soru çözümleme | **Render** / **Railway** / VPS |
| **Veritabanı** | PostgreSQL 16 (pgcrypto) | Çift girişli defter (Ledger), pozisyonlar, kullanıcılar | Render / Railway / Supabase |
| **Önbellek & Pub/Sub** | Redis 7 | Liderlik tablosu (ZSET), WebSocket fiyat yayını | Render / Railway / Upstash |
| **Tersine Proxy & SSL** | Caddy v2 | Otomatik Let's Encrypt SSL, WSS & HTTP/3 desteği | VPS Dağıtımlarında |

---

## 🌟 1. YOL: Vercel + Render (Önerilen & Hızlı Bulut Kurulumu)

Bu yöntem, Next.js ön yüzünü Vercel'in global Edge CDN altyapısında çalıştırırken; veritabanı, Redis ve Python servislerini Render üzerinde barındırır.

### Adım 1: Render ile Veritabanı ve Arka Yüzün Kurulumu

Projeye eklenen `render.yaml` (Render Blueprint) şablonu sayesinde tüm altyapı tek tıkla ayağa kalkar:

1. [Render Dashboard](https://dashboard.render.com/)'a giriş yapın.
2. **Blueprints** sekmesine gidin ve **New Blueprint Instance** butonuna tıklayın.
3. Kahin GitHub deponuzu bağlayın.
4. Render, `render.yaml` dosyasını otomatik algılayacak ve şu servisleri tek seferde planlayacaktır:
   - `kahin-db` (PostgreSQL Veritabanı)
   - `kahin-redis` (Redis Önbellek)
   - `kahin-backend` (FastAPI Docker servisi — `/health` kontrolüyle)
   - `kahin-admin` (Streamlit Docker servisi)
5. **Apply** butonuna basarak dağıtımı başlatın.
6. Dağıtım tamamlandığında Render size iki URL verecektir:
   - Backend URL: `https://kahin-backend-xxxx.onrender.com`
   - Admin Panel URL: `https://kahin-admin-xxxx.onrender.com`

> **Otomatik Migration & Seed:** `backend/scripts/start.sh` giriş betiği, sunucu her açıldığında Alembic migration'larını (`alembic upgrade head`) ve başlangıç verilerini (`scripts.seed`) otomatik olarak uygular.

---

### Adım 2: Vercel ile Next.js Ön Yüzün Kurulumu

1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin ve **Add New... -> Project** seçin.
2. Kahin GitHub deponuzu bağlayın.
3. **Root Directory** olarak `frontend-web` klasörünü seçin.
4. **Environment Variables** bölümüne şu değişkenleri ekleyin:
   - `NEXT_PUBLIC_API_URL`: `https://kahin-backend-xxxx.onrender.com/api/v1`
   - `NEXT_PUBLIC_WS_URL`: `wss://kahin-backend-xxxx.onrender.com/ws/markets`
5. **Deploy** butonuna tıklayın.
6. Vercel size bir ön yüz adresi tahsis edecektir: `https://kahin.vercel.app` (veya kendi özel alan adınız).

---

### Adım 3: CORS Senkronizasyonu

Vercel alan adınızı Render üzerindeki `kahin-backend` servisinin ortam değişkenlerine ekleyin:
- Render Dashboard -> `kahin-backend` -> **Environment** sekmesi:
  - `CORS_ORIGINS`: `https://kahin.vercel.app,https://seninalanadin.com`
- Servisi yeniden başlatın (Manual Deploy -> Deploy latest commit).

Artık platformunuz dünya genelinde canlı ve kullanıma hazırdır! 🎉

---

## 🚂 2. YOL: Railway ile Hepsi Bir Arada Dağıtım

Railway, tüm mikroservisleri tek bir proje altında görsel bir tuvalde çalıştırmanıza olanak tanır.

1. [Railway.app](https://railway.app/)'e gidin ve **New Project** oluşturun.
2. **Provision PostgreSQL** ve **Provision Redis** butonlarıyla veritabanlarını ekleyin.
3. **Create Service from GitHub Repo** diyerek deponuzu bağlayın.
4. İki ayrı servis tanımlayın:
   - **Backend Servisi:**
     - Settings -> Root Directory: `/backend` veya Dockerfile: `backend/Dockerfile`
     - Variables:
       - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
       - `REDIS_URL`: `${{Redis.REDIS_URL}}`
       - `JWT_SECRET`: `(Rastgele 32+ karakter)`
       - `CORS_ORIGINS`: `*`
   - **Frontend Servisi:**
     - Settings -> Root Directory: `/frontend-web`
     - Variables:
       - `NEXT_PUBLIC_API_URL`: `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1`
       - `NEXT_PUBLIC_WS_URL`: `wss://${{backend.RAILWAY_PUBLIC_DOMAIN}}/ws/markets`

---

## 🖥️ 3. YOL: Bağımsız Sunucu (VPS - Hetzner / DigitalOcean / AWS EC2)

Tüm platformu kendi Ubuntu/Debian sunucunuzda, Docker ve otomatik Let's Encrypt SSL sağlayan Caddy ile barındırmak için:

### 1. Sunucu Hazırlığı
Sunucunuza SSH ile bağlanın ve Docker bileşenlerini kurun:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# Docker & Compose kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Güvenlik duvarını (UFW) ayarlayın:
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

### 2. Depoyu Çekme ve Yapılandırma
```bash
git clone https://github.com/kullanici-adiniz/kahin.git
cd kahin

# Üretim ortam dosyasını oluşturun
cp .env.production.example .env.production
nano .env.production
```

`.env.production` dosyasında kendi alan adınızı ve güvenli şifrelerinizi belirleyin:
```ini
DOMAIN=kahin.seninalanadin.com
POSTGRES_USER=kahin
POSTGRES_PASSWORD=GucluSifre123!
POSTGRES_DB=kahin
JWT_SECRET=super_secret_kahin_token_key_change_me_32chars!
NEXT_PUBLIC_API_URL=https://kahin.seninalanadin.com/api/v1
NEXT_PUBLIC_WS_URL=wss://kahin.seninalanadin.com/ws/markets
```

### 3. Tek Komutla Canlıya Alma
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Bu komut:
1. PostgreSQL ve Redis konteynerlerini ayağa kaldırır.
2. FastAPI backend için migration ve seed işlemlerini yapar.
3. Next.js standalone imajını derler.
4. Streamlit yönetici panelini ayağa kaldırır.
5. Caddy, `DOMAIN` adresiniz için Let's Encrypt'ten **otomatik ücretsiz SSL sertifikası** alır ve tüm trafiği güvenli HTTPS ve WSS üzerinden yönlendirir.

---

## 🛡️ Veritabanı Yedekleme & Kurtarma (Disaster Recovery)

Üretim ortamında PostgreSQL veritabanını günlük olarak yedeklemek için bir cronjob tanımlayabilirsiniz:

```bash
# Manuel yedek alma
docker exec -t kahin-postgres-prod pg_dump -U kahin kahin | gzip > kahin_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Geri yükleme (Restore)
gunzip < kahin_backup_20261015.sql.gz | docker exec -i kahin-postgres-prod psql -U kahin kahin
```

---

## 🔍 Sağlık Kontrolleri (Healthchecks)

Dağıtım sonrasında sistemin sağlıklı çalıştığını doğrulamak için:
- **API Sağlık:** `curl https://<backend-url>/health` -> `{"status":"ok"}`
- **Admin Panel Sağlık:** `curl https://<admin-url>/_stcore/health` -> `ok`
- **WebSocket Kontrolü:** Tarayıcı konsolunda `new WebSocket("wss://<backend-url>/ws/markets")` bağlantısının `OPEN` durumuna geçmesi.
