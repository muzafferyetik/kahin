# 🛠️ Streamlit Yönetici Paneli ve Gündem Botu

Platformdaki tahmin sorularının açılması, oranların izlenmesi ve süresi biten soruların sonuçlandırılması **Python (Streamlit)** ile yazılmış yönetici paneli üzerinden yapılır. Veritabanı olarak ana sistemdeki **PostgreSQL** kullanılır.

---

## 1. Streamlit Yönetici Paneli (`admin-panel/app.py`)

Tek bir Python dosyasıyla çalışan, doğrudan PostgreSQL veritabanına ve FastAPI sunucusuna bağlı operasyon ekranıdır.

### A. Sekme 1: Yeni Soru Aç (Manuel Soru Oluşturma)
Yöneticinin gündeme göre hızlıca yeni bir tahmin piyasası açtığı form ekranıdır:
- **Soru Başlığı:** Örn: *"Bu akşamki Galatasaray - Fenerbahçe derbisinde kırmızı kart çıkar mı?"*
- **URL Kısaltması (`slug`):** Başlıktan otomatik üretilir (Örn: `gs-fb-derbisi-kirmizi-kart`), istenirse düzenlenebilir.
- **Kategori Seçimi:** `FUTBOL`, `MAGAZIN`, `GUNDEM`, `EKONOMI`
- **Kapanış Tarihi ve Saati (`closes_at`):** Tahminlerin kilitleneceği an (Örn: Maçın başlama saati).
- **Çözümleme Kuralı (`resolution_criteria`):** Sorunun neye göre EVET veya HAYIR sayılacağının net açıklaması.
- **Başlangıç İhtimali:** Varsayılan `%50 EVET - %50 HAYIR` (`1000 YES / 1000 NO` hisse havuzu).
- **"🚀 Yayına Al"** butonuna basıldığında soru PostgreSQL `markets` tablosuna `status = 'OPEN'` olarak kaydedilir, `market_price_history` tablosuna ilk `%50-%50` kaydı atılır ve sitede anında görünür.

### B. Sekme 2: Aktif Piyasalar ve Acil Durum Kilidi
- Yayındaki tüm soruları, toplam işlem hacmini (`volume_kp`) ve anlık oranları listeler.
- **Erken Kilit (Freeze):** Bir maçta veya gündem olayında beklenmedik bir durum/iptal olursa, yönetici tek tuşla soruyu `LOCKED` (Alım-satıma kapalı) duruma getirebilir veya `CANCELLED` yapıp herkesin yatırdığı KP'yi (`total_invested_kp`) iade edebilir.

### C. Sekme 3: Soru Sonuçlandırma (Market Resolution)
- Kapanış saati geçmiş (`closes_at` dolmuş) soruları en üstte listeler.
- Yönetici resmi sonuca göre **"✅ EVET KAZANDI"** veya **"❌ HAYIR KAZANDI"** butonuna basar.
- Butona basıldığı anda FastAPI üzerindeki `/api/v1/admin/markets/{id}/resolve` uç noktası tetiklenir ve Celery işçileri kazananların KP ödemelerini (`1 Kazanan Hisse = 1 KP`) ile Keskinlik Skorlarını arka planda dağıtır.

---

## 2. Opsiyonel: Otomatik Gündem ve Soru Botu (`question-bot/`)

*(Not: Bu modül MVP sonrasında, içerik üretimini hızlandırmak istendiğinde devreye alınacaktır.)*

- Arka planda çalışan basit bir Python betiğidir (`generator.py`).
- Google Trends Türkiye RSS akışını ve spor/magazin haber başlıklarını okur.
- Gemini API veya OpenAI API kullanarak bu haberlerden `"EVET / HAYIR"` formatında taslak sorular üretir ve PostgreSQL `markets` tablosuna `status = 'DRAFT'` (Taslak) olarak yazar.
- Yönetici Streamlit paneline girdiğinde bu hazır taslakları görür, beğendiğini tek tuşla onaylayıp (`status = 'OPEN'`) yayına alır.
