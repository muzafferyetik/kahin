# 💻 Web Frontend ve PWA Mimarisi (Next.js + Tailwind CSS)

Platform, hem masaüstünde geniş bir "gündem borsası" terminali gibi çalışacak hem de telefondan girildiğinde (Mobile-First) alt navigasyon barıyla tıpkı bir mobil uygulama hissiyatı verecek şekilde tasarlanacaktır.

---

## 1. Temel Kütüphaneler ve Araçlar
- **Framework:** Next.js (App Router) — Sunucu taraflı oluşturma (SSR), SEO ve dinamik sosyal medya kartları (`@vercel/og`) için.
- **Stil & UI:** Tailwind CSS + `shadcn/ui` (Radix tabanlı modern modal, drawer, tab ve slider bileşenleri).
- **Grafik Motoru:** `lightweight-charts` (TradingView'in açık kaynaklı, yüksek performanslı HTML5 Canvas grafik kütüphanesi — Polymarket'in kullandığı altyapı).
- **Durum & Veri Yönetimi:** TanStack Query (React Query) + Zustand (Kullanıcı bakiyesi ve canlı WebSocket state'i için).
- **Görsel Paylaşım:** `html-to-image` (DOM üzerindeki "Ben Demiştim!" Kanıt Kartını tek tıkla PNG olarak indirmek veya Web Share API ile paylaşmak için).

---

## 2. Sayfa Yapısı ve Rotalar (Routing)

| Rota (URL) | Sayfa Adı | Açıklama |
| :--- | :--- | :--- |
| `/` | Ana Vitrin (Explore) | Kategori sekmeleri (`🔥 Trend`, `⚽ Futbol`, `📸 Magazin`, `📈 Ekonomi`), günün manşet sorusu ve canlı soru kartları ızgarası (Grid). |
| `/m/[slug]` | Soru Detay & Borsa | Örn: `/m/gs-fb-derbisi-kirmizi-kart`. Canlı TradingView grafiği, sağ tarafta Al-Sat kutusu (`TradeWidget`), altında kulis yorumları. |
| `/siralama` | Liderlik Tablosu | Haftalık lig kademeleri, Türkiye Top 100 listesi ve kategori bazlı en keskin kahinler. |
| `/kanka-ligi` | Kanka Ligleri | Davet linkiyle (`kahin.com/davet/x8k9a`) arkadaş grubuna katılma, grup içi özel soru açma ve arkadaş sıralaması. |
| `/profil/[username]` | Kullanıcı Profili | Açık pozisyonlar, portföy büyüme grafiği, kazanılan rozetler ve üretilen "Kanıt Kartları" galerisi. |
| `/api/og` | Dinamik OG Görseli | Sosyal medyada paylaşılan soru linkleri için anlık oranları içeren otomatik resim üretici uç nokta. |

---

## 3. Kullanıcı Deneyimi (UX) ve Temel Bileşenler

### A. Duyarlı (Responsive) Yerleşim
- **Masaüstü (Desktop):** 3 sütunlu veya geniş ızgara (Grid) görünümü. Soru detay sayfasında sol geniş alanda canlı grafik ve yorumlar, sağda sabit (sticky) **Alım-Satım Paneli**.
- **Mobil Tarayıcı (Mobile Web / PWA):** Alt kısımda sabit 4'lü navigasyon barı (`Keşfet`, `Liderlik`, `Kanka Ligi`, `Portföyüm`). Soru detayında "Evet / Hayır" butonuna basıldığında ekranın altından kayarak açılan **Drawer (Çekmece)** alım-satım kutusu.

### B. İstemci Taraflı Canlı AMM Hesaplayıcı (`useAMMCalculator` Hook)
Kullanıcı Al-Sat kutusundaki kaydırıcıyı (Slider) hareket ettirip yatıracağı `KP` miktarını veya satacağı hisse adedini değiştirdiğinde, sunucuya istek atmadan tarayıcıda anlık olarak şu veriler hesaplanır (Backend `PredictionAMM` ile %100 aynı matematik):

```typescript
export function calculateBuyPreview(
  side: 'YES' | 'NO',
  investmentKp: number,
  yesPool: number,
  noPool: number
) {
  if (investmentKp <= 0) {
    const yesProb = (noPool / (yesPool + noPool)) * 100;
    return {
      sharesReceived: 0,
      potentialProfit: 0,
      roiPercent: 0,
      newYesProb: Number(yesProb.toFixed(1)),
      newNoProb: Number((100 - yesProb).toFixed(1)),
    };
  }

  const k = yesPool * noPool;
  let sharesReceived = 0;
  let newYesPool = yesPool;
  let newNoPool = noPool;

  if (side === 'YES') {
    newNoPool = noPool + investmentKp;
    newYesPool = k / newNoPool;
    sharesReceived = (yesPool + investmentKp) - newYesPool;
  } else {
    newYesPool = yesPool + investmentKp;
    newNoPool = k / newYesPool;
    sharesReceived = (noPool + investmentKp) - newNoPool;
  }

  const newYesProb = (newNoPool / (newYesPool + newNoPool)) * 100;
  const potentialProfit = sharesReceived - investmentKp; // 1 Kazanan Hisse = 1 KP

  return {
    sharesReceived: Number(sharesReceived.toFixed(2)),
    potentialProfit: Number(potentialProfit.toFixed(2)),
    roiPercent: Number(((potentialProfit / investmentKp) * 100).toFixed(1)),
    newYesProb: Number(newYesProb.toFixed(1)),
    newNoProb: Number((100 - newYesProb).toFixed(1)),
  };
}

export function calculateSellPreview(
  side: 'YES' | 'NO',
  sharesToSell: number,
  yesPool: number,
  noPool: number
) {
  if (sharesToSell <= 0) {
    const yesProb = (noPool / (yesPool + noPool)) * 100;
    return {
      payoutKp: 0,
      newYesProb: Number(yesProb.toFixed(1)),
      newNoProb: Number((100 - yesProb).toFixed(1)),
    };
  }

  const k = yesPool * noPool;
  let payoutKp = 0;
  let newYesPool = yesPool;
  let newNoPool = noPool;

  if (side === 'YES') {
    const y = yesPool + sharesToSell;
    const n = noPool;
    const discriminant = Math.pow(y - n, 2) + 4 * k;
    payoutKp = (y + n - Math.sqrt(discriminant)) / 2;
    newYesPool = y - payoutKp;
    newNoPool = n - payoutKp;
  } else {
    const n = noPool + sharesToSell;
    const y = yesPool;
    const discriminant = Math.pow(n - y, 2) + 4 * k;
    payoutKp = (n + y - Math.sqrt(discriminant)) / 2;
    newNoPool = n - payoutKp;
    newYesPool = y - payoutKp;
  }

  const newYesProb = (newNoPool / (newYesPool + newNoPool)) * 100;

  return {
    payoutKp: Number(payoutKp.toFixed(2)),
    newYesProb: Number(newYesProb.toFixed(1)),
    newNoProb: Number((100 - newYesProb).toFixed(1)),
  };
}
```

### C. Kulis Yorumları (Skin-in-the-Game Comments)
- Bir sorunun altındaki tartışma alanında yorum yapan her kullanıcının kullanıcı adının yanında sistem otomatik olarak o sorudaki pozisyonunu rozet olarak basar:
  - 🟢 `AhmetY [EVET • 1.250 Hisse]`
  - 🔴 `MehmetK [HAYIR • 800 Hisse]`
- Pozisyonu olmayan kullanıcılar yorumları okuyabilir ancak yorum yazabilmek için o soruda en az `50 KP` değerinde aktif hisseye sahip olması gerekir (trol ve spam yorumları %99 oranında keser).

### D. Viral Paylaşım Motoru (Dynamic OG & Kanıt Kartı)
1. **Canlı Link Önizlemesi:** Kullanıcı `/m/tcmb-ekim-faiz-karari` linkini kopyalayıp WhatsApp grubuna veya X'e yapıştırdığında, Next.js `ImageResponse` kullanılarak soru başlığını ve o saniyedeki `EVET %72 | HAYIR %28` barını içeren şık bir görsel otomatik oluşturulur.
2. **"Ben Demiştim!" Kanıt Kartı:** Düşük ihtimalli (`<%40`) bir tahmini bilen kullanıcı tek tuşla `1080x1350` veya `1080x1920` boyutunda, üzerinde QR kod bulunan başarı kartını PNG olarak indirir veya mobilde doğrudan paylaşım menüsünü (`navigator.share`) açar.
