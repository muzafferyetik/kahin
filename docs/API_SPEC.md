# 🌐 API ve WebSocket Sözleşmesi (FastAPI)

Tüm REST uç noktaları `/api/v1` öneki (prefix) ile sunulur. Kimlik doğrulama gerektiren uç noktalarda `Authorization: Bearer <JWT_TOKEN>` başlığı zorunludur.

---

## 1. Temel REST API Uç Noktaları

### A. Kimlik Doğrulama ve Ekonomi (`auth` & `wallet`)
| Metod | Endpoint | Açıklama | Yetki |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Kullanıcı kaydı ve başlangıç `1.000 KP` tanımlaması (`INITIAL_GRANT`) | Herkese Açık |
| `POST` | `/api/v1/auth/login` | Giriş yapma ve JWT Access Token alma | Herkese Açık |
| `GET` | `/api/v1/auth/me` | Aktif kullanıcının profil, bakiye ve açık pozisyon özeti | Kullanıcı |
| `POST` | `/api/v1/wallet/daily-bonus` | Günlük `100 KP` (7. günde `250 KP`) seri bonusunu talep eder | Kullanıcı |
| `POST` | `/api/v1/wallet/bankruptcy-support` | Toplam portföyü `< 50 KP` olan kullanıcıya `200 KP` destek verir (Günde max 3) | Kullanıcı |

### B. Tahmin Piyasaları ve Borsa İşlemleri (`markets` & `trade`)
| Metod | Endpoint | Açıklama | Yetki |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/markets` | Aktif soruları kategori (`FUTBOL`, `MAGAZIN` vb.) ve popülerliğe göre listeler | Herkese Açık |
| `GET` | `/api/v1/markets/{slug}` | Soru detayı, `market_price_history` grafik verisi ve kulis yorumlarını döner | Herkese Açık |
| `POST` | `/api/v1/trade/buy` | Seçilen soruda `YES` veya `NO` hissesi satın alır (`SELECT FOR UPDATE` kilidi ile) | Kullanıcı |
| `POST` | `/api/v1/trade/sell` | Sonuçlanmamış sorudaki hisseyi anlık orandan havuza geri satar (Cash-Out) | Kullanıcı |
| `POST` | `/api/v1/markets/{id}/comments` | Sadece o soruda en az 50 KP değerinde hissesi olan kullanıcının yorum yazmasını sağlar | Kullanıcı |

### C. Liderlik Tablosu ve Kanka Ligleri (`leaderboard` & `leagues`)
| Metod | Endpoint | Açıklama | Yetki |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/leaderboard` | Redis `ZSET` üzerinden haftalık portföy ve keskinlik sıralamasını döner | Herkese Açık |
| `POST` | `/api/v1/leagues/create` | Yeni bir "Kanka Ligi" (özel arkadaş grubu ve davet kodu) oluşturur | Kullanıcı |
| `POST` | `/api/v1/leagues/join/{invite_code}` | Davet koduyla bir Kanka Ligine katılır | Kullanıcı |
| `POST` | `/api/v1/leagues/{id}/markets` | Sadece ilgili Kanka Ligi üyelerinin görebileceği özel soru açar | Kullanıcı |

### D. Yönetici Paneli İşlemleri (`admin`)
| Metod | Endpoint | Açıklama | Yetki |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/markets` | Yeni soru oluşturur (`OPEN` veya `DRAFT`) ve ilk fiyat kaydını oluşturur | Admin |
| `PATCH` | `/api/v1/admin/markets/{id}/status` | Soruyu `LOCKED` (kilitli) veya `CANCELLED` (iade) durumuna getirir | Admin |
| `POST` | `/api/v1/admin/markets/{id}/resolve` | Soruyu sonuçlandırır (`YES` / `NO`) ve Celery ödeme kuyruğunu tetikler | Admin |

---

## 2. Örnek İstek / Yanıt Şemaları

### A. Hisse Alımı: `POST /api/v1/trade/buy`
*(Başlangıç havuzu `1000 YES / 1000 NO` olan bir soruya `250 KP` yatırıldığında matematiksel olarak birebir tutarlı çıktı)*

**Request Body:**
```json
{
  "market_id": "c9a646d3-9c61-4cb7-bfcd-8252298f6342",
  "side": "YES",
  "amount_kp": 250.00
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "transaction": {
    "shares_bought": 450.0000,
    "entry_probability": 50.0,
    "remaining_kp_balance": 750.00
  },
  "market_state": {
    "yes_pool": 800.0000,
    "no_pool": 1250.0000,
    "yes_prob": 61.0,
    "no_prob": 39.0,
    "volume_kp": 250.00
  }
}
```

### B. Hisse Satışı (Cash-Out): `POST /api/v1/trade/sell`
**Request Body:**
```json
{
  "market_id": "c9a646d3-9c61-4cb7-bfcd-8252298f6342",
  "side": "YES",
  "shares_to_sell": 200.0000
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "transaction": {
    "shares_sold": 200.0000,
    "payout_kp": 117.22,
    "new_kp_balance": 867.22
  },
  "market_state": {
    "yes_pool": 882.7800,
    "no_pool": 1132.7800,
    "yes_prob": 56.2,
    "no_prob": 43.8
  }
}
```

---

## 3. Gerçek Zamanlı WebSocket Akışı

Web istemcisi (Next.js) bir soru detayına girdiğinde veya ana sayfadayken canlı oran değişimlerini dinler:

- **Bağlantı URL'i:** `wss://api.kahin.com/ws/markets`
- **Sunucudan İstemciye Gelen Mesaj (Tick Event):**
```json
{
  "event": "PRICE_TICK",
  "market_id": "c9a646d3-9c61-4cb7-bfcd-8252298f6342",
  "slug": "gs-fb-derbisi-kirmizi-kart",
  "yes_prob": 61.0,
  "no_prob": 39.0,
  "volume_kp": 250.00,
  "last_trade_side": "YES",
  "timestamp": "2026-10-15T20:15:30Z"
}
```
