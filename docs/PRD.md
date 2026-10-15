# 📋 Ürün Gereksinim Dokümanı (PRD)

## 1. Yasal Çerçeve ve Kırmızı Çizgiler (Türkiye Mevzuatı)
Platformun 7258 Sayılı Kanun ve Milli Piyango İdaresi (MPİ) yönetmelikleri kapsamında "bahis/şans oyunu" sayılmaması için aşağıdaki kurallar sistem mimarisinde değiştirilemez şekilde uygulanır:

1. **Tek Yönlü Kapalı Ekonomi (Zero Cash-Out):** Platform içindeki hiçbir puan veya birim nakde (TL), kripto varlığa, hediye çekine veya fiziksel bir ödüle dönüştürülemez.
2. **Transfer Yasağı:** Kullanıcılar birbirlerine puan/coin gönderemez (üçüncü parti karaborsa oluşumunu engeller).
3. **Rekabet Parasının Satılamaması:** Tahmin yapmak için kullanılan **Kahin Puanı (KP)** gerçek parayla satın alınamaz.

---

## 2. Çift Katmanlı Ekonomi (Dual-Currency)

### A. Kahin Puanı (KP) — *Tahmin Birimi*
- **Başlangıç Bakiyesi:** Yeni kayıt olan her kullanıcıya `1.000 KP` tanımlanır.
- **Günlük Bonus:** Her gün platforma giriş yapan kullanıcıya `100 KP` (7 günlük kesintisiz seride `250 KP`) verilir.
- **İflas Destek Paketi:** Toplam portföy değeri (nakit KP + açık pozisyonların anlık değeri) `50 KP` altına düşen kullanıcı, ödüllü reklam (Rewarded Ad) izleyerek veya günlük görev tamamlayarak günde en fazla 3 kez `200 KP` destek alabilir.
- **Kullanım Yeri:** Sadece tahmin havuzlarında "Evet / Hayır" hissesi alıp satmak için kullanılır.

### B. Elmas — *Statü ve Özelleştirme Birimi*
- **Kazanım:** Web mağazası üzerinden satın alma (Cosmetic Microtransactions / Kahin Plus), haftalık ligi ilk 3'te bitirme veya arkadaş davet etme (Referral).
- **Kullanım Yeri:**
  - Özel profil çerçeveleri, animasyonlu rozetler ve unvanlar (*"Derbi Baronu", "Magazin Müfettişi"*).
  - **"Balina Takibi":** Türkiye Top 100 listesindeki kullanıcıların hangi soruya ne oynadığını anlık görme.
  - Kanka Ligi katılımcı limitini artırma ve özel grup rozeti tanımlama.

---

## 3. Oyunlaştırma ve Lig Mekaniği

### A. İki Ayrı Başarı Metriği
1. **Portföy Değeri (Net Worth):** `Nakit KP + Açık Hisselerin Anlık Bozdurma Değeri`. Kullanıcının ne kadar doğru zamanda al-sat yaptığını gösterir.
2. **Keskinlik Skoru (Kahinlik Oranı):** Kullanıcının bildiği tahminlerin zorluk derecesine (alım anındaki ağırlıklı ortalama ihtimale) göre hesaplanır:
   - Formül: `Kazanılan Keskinlik Puanı = round((100 - avg_entry_probability) * 0.5, 2)`
   - Örnek: Oranı `%85` olan bir olayı bilmek `+7.5` Keskinlik Puanı getirirken, oranı `%12` olan bir sürprizi bilmek `+44.0` Keskinlik Puanı kazandırır.

### B. Haftalık Sezon ve Kademeler (Tiers)
- Her Pazartesi `00:00`'da haftalık sezon başlar ve Pazar `23:59`'da biter.
- Kullanıcılar 50 kişilik havuzlarda yarışır. İlk 10 üst kademeye çıkar, son 10 alt kademeye düşer.
- **Kademeler:** `CAYLAK` (Çaylak) ➔ `GOZLEMCI` (Gözlemci) ➔ `ANALIST` (Analist) ➔ `USTAT` (Üstat) ➔ `KAHINLER_MECLISI` (Türkiye Top 100)

### C. Kanka Ligi (Sosyal Grup Modülü)
- Kullanıcılar davet linkiyle (`kahin.com/davet/KOD`) kapalı arkadaş grubu kurabilir.
- **Özel Grup Soruları:** Grup üyeleri sadece o grupta görünen sorular açabilir (Örn: *"Halı saha maçında Ahmet en az 2 gol atar mı?"*).
- Özel grup sorularında sonucu grup kurucusu (`owner`) onaylar.

### D. "Ben Demiştim!" Kanıt Kartı
- Bir soru sonuçlandığında, kazanan kullanıcının hisselerini aldığı andaki ortalama ihtimal (`avg_entry_probability`) `%40`'ın altındaysa sistem otomatik olarak paylaşılabilir bir görsel kart üretir.
- Kart içeriği: Soru başlığı, kullanıcının alım yaptığı tarih/saat, o anki düşük ihtimal yüzdesi (`%14 İhtimal Varken Bildi!`), kullanıcı adı ve sorunun QR kodu.
