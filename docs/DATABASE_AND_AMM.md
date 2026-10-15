# 🗄️ Veritabanı Şeması, Redis Mimarisi ve AMM (Fiyatlama) Motoru

## 1. PostgreSQL Veritabanı Şeması (DDL)

Veri bütünlüğü, grafik geçmişi, Kanka Ligleri, rozetli yorumlar ve eşzamanlı işlemlerde bakiye kaymalarını önleyen **Çift Kayıtlı Muhasebe (Ledger)** yapısı aşağıdadır:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Kullanıcılar Tablosu
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    kp_balance NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (kp_balance >= 0),
    diamond_balance INTEGER NOT NULL DEFAULT 0 CHECK (diamond_balance >= 0),
    accuracy_score NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    tier VARCHAR(24) NOT NULL DEFAULT 'CAYLAK'
        CHECK (tier IN ('CAYLAK', 'GOZLEMCI', 'ANALIST', 'USTAT', 'KAHINLER_MECLISI')),
    streak_count INTEGER NOT NULL DEFAULT 0,
    last_daily_claim_at TIMESTAMPTZ,
    daily_bankruptcy_claims INTEGER NOT NULL DEFAULT 0,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Kanka Ligleri (Özel Arkadaş Grupları) Tablosu
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL,
    invite_code VARCHAR(16) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_members INTEGER NOT NULL DEFAULT 25,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE league_members (
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (league_id, user_id)
);

-- 3. Tahmin Piyasaları (Sorular) Tablosu
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL, -- Örn: 'gs-fb-derbisi-kirmizi-kart'
    title VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL
        CHECK (category IN ('FUTBOL', 'MAGAZIN', 'GUNDEM', 'EKONOMI', 'KANKA')),
    resolution_criteria TEXT NOT NULL, -- Sorunun neye göre "EVET" sayılacağının net kuralı
    yes_pool NUMERIC(14, 4) NOT NULL DEFAULT 1000.0000 CHECK (yes_pool > 0),
    no_pool NUMERIC(14, 4) NOT NULL DEFAULT 1000.0000 CHECK (no_pool > 0),
    k_constant NUMERIC(28, 8) NOT NULL DEFAULT 1000000.00000000 CHECK (k_constant > 0),
    volume_kp NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('DRAFT', 'OPEN', 'LOCKED', 'RESOLVED_YES', 'RESOLVED_NO', 'CANCELLED')),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE, -- Sadece 'KANKA' kategorisindeki özel sorular için dolu olur
    created_by UUID REFERENCES users(id),
    closes_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Kullanıcı Pozisyonları (Eldeki Hisseler)
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    side VARCHAR(3) NOT NULL CHECK (side IN ('YES', 'NO')),
    shares NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (shares >= 0),
    total_invested_kp NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_invested_kp >= 0),
    avg_entry_probability NUMERIC(5, 2) NOT NULL, -- Kanıt kartı ve Keskinlik Skoru için ağırlıklı giriş ihtimali (%)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, market_id, side)
);

-- 5. Muhasebe Kayıtları (Her KP hareketinin değiştirilemez kaydı - Double-Entry Ledger)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
    tx_type VARCHAR(32) NOT NULL
        CHECK (tx_type IN ('INITIAL_GRANT', 'DAILY_BONUS', 'BANKRUPTCY_SUPPORT', 'BUY_SHARES', 'SELL_SHARES', 'MARKET_PAYOUT', 'MARKET_REFUND')),
    amount NUMERIC(12, 2) NOT NULL, -- Pozitif (+) veya Negatif (-)
    balance_after NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Oran Geçmişi Tablosu (TradingView Lightweight Charts için zaman serisi)
CREATE TABLE market_price_history (
    id BIGSERIAL PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    yes_prob NUMERIC(5, 2) NOT NULL,
    no_prob NUMERIC(5, 2) NOT NULL,
    volume_kp NUMERIC(14, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Kulis Yorumları Tablosu (Sadece hisse sahiplerinin yazabildiği yorumlar)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_side VARCHAR(3) NOT NULL CHECK (user_side IN ('YES', 'NO')),
    user_shares_snapshot NUMERIC(14, 2) NOT NULL, -- Yorum anındaki hisse miktarı rozeti
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performans İndeksleri
CREATE INDEX idx_markets_status_category ON markets(status, category);
CREATE INDEX idx_markets_slug ON markets(slug);
CREATE INDEX idx_positions_user_market ON positions(user_id, market_id);
CREATE INDEX idx_positions_market ON positions(market_id);
CREATE INDEX idx_ledger_user ON ledger_entries(user_id, created_at DESC);
CREATE INDEX idx_price_history_market_time ON market_price_history(market_id, recorded_at ASC);
CREATE INDEX idx_comments_market_time ON comments(market_id, created_at DESC);
```

---

## 2. Redis Anahtar (Key) Mimarisi

- **Canlı Haftalık Liderlik Tablosu (Sorted Set):**
  - Key: `leaderboard:weekly:{YYYY_WW}` (Örn: `leaderboard:weekly:2026_42`)
  - Komut: `ZADD leaderboard:weekly:2026_42 <net_worth> <user_id>`
- **Keskinlik (Kahinlik) Liderlik Tablosu:**
  - Key: `leaderboard:accuracy:global`
  - Komut: `ZADD leaderboard:accuracy:global <accuracy_score> <user_id>`
- **Kanka Ligi Sıralaması:**
  - Key: `leaderboard:league:{league_id}`
- **Anlık Oran Yayın Kanalı (Pub/Sub):**
  - Kanal: `channel:market:{market_id}`
  - Payload: `{"event": "PRICE_TICK", "market_id": "...", "yes_prob": 55.6, "no_prob": 44.4, "volume_kp": 1250.00}`

---

## 3. Python AMM (CPMM) Fiyatlama Motoru (Alım & Satım)

Sabit Çarpımlı Piyasa Yapıcı (`k = yes_pool * no_pool`) algoritmasının hem **Hisse Alımı (`buy_shares`)** hem de **Erken Bozdurma / Hisse Satışı (`sell_shares`)** için matematiksel olarak tam tersinir (reversible) Python implementasyonu:

```python
from decimal import Decimal, ROUND_HALF_UP

class PredictionAMM:
    """
    Sabit Çarpımlı (x * y = k) İkili Tahmin Piyasası Motoru.
    - 1 KP yatırım havuza girdiğinde 1 YES + 1 NO hissesi basılır (mint).
    - Çözümleme (Resolution) anında kazanan taraftaki 1 Hisse = 1.00 KP öder.
    """
    def __init__(self, yes_pool: Decimal, no_pool: Decimal):
        self.yes_pool = Decimal(str(yes_pool))
        self.no_pool = Decimal(str(no_pool))
        self.k = self.yes_pool * self.no_pool

    def get_probabilities(self) -> dict:
        total = self.yes_pool + self.no_pool
        # Evet havuzu ne kadar azalırsa (satın alınırsa), Evet ihtimali o kadar yükselir
        yes_prob = (self.no_pool / total) * Decimal("100")
        no_prob = (self.yes_pool / total) * Decimal("100")
        return {
            "yes_prob": yes_prob.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP),
            "no_prob": no_prob.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        }

    def buy_shares(self, side: str, investment_kp: Decimal) -> dict:
        """
        Kullanıcı belirli bir KP yatırarak 'YES' veya 'NO' hissesi satın alır.
        """
        inv = Decimal(str(investment_kp))
        if inv <= Decimal("0"):
            raise ValueError("Yatırım miktarı 0'dan büyük olmalıdır.")

        entry_probs = self.get_probabilities()
        entry_prob = entry_probs["yes_prob"] if side == "YES" else entry_probs["no_prob"]

        if side == "YES":
            new_no_pool = self.no_pool + inv
            new_yes_pool = self.k / new_no_pool
            shares_received = (self.yes_pool + inv) - new_yes_pool
            self.yes_pool, self.no_pool = new_yes_pool, new_no_pool
        elif side == "NO":
            new_yes_pool = self.yes_pool + inv
            new_no_pool = self.k / new_yes_pool
            shares_received = (self.no_pool + inv) - new_no_pool
            self.yes_pool, self.no_pool = new_yes_pool, new_no_pool
        else:
            raise ValueError("Geçersiz taraf. 'YES' veya 'NO' olmalı.")

        new_probs = self.get_probabilities()
        return {
            "shares_received": shares_received.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
            "entry_probability": entry_prob,
            "new_yes_pool": self.yes_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
            "new_no_pool": self.no_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
            "new_yes_prob": new_probs["yes_prob"],
            "new_no_prob": new_probs["no_prob"]
        }

    def sell_shares(self, side: str, shares_to_sell: Decimal) -> dict:
        """
        Kullanıcı elindeki 'YES' veya 'NO' hisselerini sonuçlanmadan önce havuza geri satar (Cash-Out).
        Matematiksel Kural: (Pool_Side + S - Payout) * (Pool_Other - Payout) = k
        İkinci dereceden denklemin kökü: Payout = ((Y + N) - sqrt((Y - N)^2 + 4k)) / 2
        """
        s = Decimal(str(shares_to_sell))
        if s <= Decimal("0"):
            raise ValueError("Satılacak hisse miktarı 0'dan büyük olmalıdır.")

        if side == "YES":
            y = self.yes_pool + s
            n = self.no_pool
            discriminant = ((y - n) ** 2) + (Decimal("4") * self.k)
            payout_kp = ((y + n) - discriminant.sqrt()) / Decimal("2")
            self.yes_pool = y - payout_kp
            self.no_pool = n - payout_kp
        elif side == "NO":
            n = self.no_pool + s
            y = self.yes_pool
            discriminant = ((n - y) ** 2) + (Decimal("4") * self.k)
            payout_kp = ((n + y) - discriminant.sqrt()) / Decimal("2")
            self.no_pool = n - payout_kp
            self.yes_pool = y - payout_kp
        else:
            raise ValueError("Geçersiz taraf. 'YES' veya 'NO' olmalı.")

        new_probs = self.get_probabilities()
        return {
            "payout_kp": payout_kp.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "new_yes_pool": self.yes_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
            "new_no_pool": self.no_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
            "new_yes_prob": new_probs["yes_prob"],
            "new_no_prob": new_probs["no_prob"]
        }
```
