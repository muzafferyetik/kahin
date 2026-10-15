"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Download,
  Share2,
  Sparkles,
  Flame,
  CheckCircle2,
  TrendingUp,
  Award,
} from "lucide-react";

interface ProofCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  side: "YES" | "NO";
  entryProbability: number;
  investedKp: number;
  payoutKp: number;
  username: string;
  slug?: string;
}

export function ProofCardModal({
  isOpen,
  onClose,
  title,
  side,
  entryProbability,
  investedKp,
  payoutKp,
  username,
  slug,
}: ProofCardModalProps) {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const profit = Math.max(0, payoutKp - investedKp);
  const roi = investedKp > 0 ? ((profit / investedKp) * 100).toFixed(0) : "0";
  const isSurprise = entryProbability < 40;

  const shareText = `🔥 "%${entryProbability} ihtimal varken bildim!"\n\n📌 "${title}" tahmininde BEN DEMİŞTİM!\n🏆 Kazanç: +${profit.toLocaleString("tr-TR")} KP (%${roi} Getiri)\n\nSen de tahmin et: ${
    typeof window !== "undefined"
      ? `${window.location.origin}/m/${slug || ""}`
      : "https://kahin.app"
  }`;

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleShareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Ben Demiştim! — Kahin",
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        // Ignored or cancelled
      }
    } else {
      handleShareWhatsApp();
    }
  };

  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      // High-res canvas renderer (800x1000)
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 800, 1000);
      grad.addColorStop(0, "#09090b");
      grad.addColorStop(0.5, "#18181b");
      grad.addColorStop(1, "#09090b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1000);

      // Gold / Emerald border
      ctx.strokeStyle = side === "YES" ? "#10b981" : "#ef4444";
      ctx.lineWidth = 12;
      ctx.strokeRect(20, 20, 760, 960);

      // Inner subtle border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, 728, 928);

      // Brand: KAHIN
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("🔮 KAHİN", 60, 90);

      ctx.fillStyle = "#71717a";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("RESMİ KANIT KARTI", 530, 90);

      // Main Banner: BEN DEMİŞTİM!
      ctx.fillStyle = "#facc15";
      ctx.font = "900 64px sans-serif";
      ctx.fillText("BEN DEMİŞTİM!", 60, 200);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "500 22px sans-serif";
      ctx.fillText("Herkes yanılırken o bildi. Söz uçar, Kahin kanıtı kalır.", 60, 240);

      // Question Title Box
      ctx.fillStyle = "rgba(24, 24, 27, 0.8)";
      ctx.fillRect(60, 280, 680, 160);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeRect(60, 280, 680, 160);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px sans-serif";

      // Wrap title text
      const words = title.split(" ");
      let line = "";
      let y = 340;
      for (const w of words) {
        const testLine = line + w + " ";
        if (ctx.measureText(testLine).width > 620) {
          ctx.fillText(line, 80, y);
          line = w + " ";
          y += 42;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 80, y);

      // Stats Section
      // Entry Odds Box
      ctx.fillStyle = "rgba(39, 39, 42, 0.6)";
      ctx.fillRect(60, 480, 320, 180);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeRect(60, 480, 320, 180);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "600 20px sans-serif";
      ctx.fillText("GİRİŞ İHTİMALİ", 80, 525);

      ctx.fillStyle = isSurprise ? "#f87171" : "#34d399";
      ctx.font = "900 52px sans-serif";
      ctx.fillText(`%${entryProbability.toFixed(1)}`, 80, 595);

      ctx.fillStyle = isSurprise ? "#f87171" : "#10b981";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(isSurprise ? "🔥 İMKANSIZI BİLDİ!" : "🎯 TAM İSABET", 80, 635);

      // Profit Box
      ctx.fillStyle = "rgba(39, 39, 42, 0.6)";
      ctx.fillRect(420, 480, 320, 180);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeRect(420, 480, 320, 180);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "600 20px sans-serif";
      ctx.fillText("NET GETİRİ / ROI", 440, 525);

      ctx.fillStyle = "#10b981";
      ctx.font = "900 52px sans-serif";
      ctx.fillText(`+${profit.toLocaleString("tr-TR")} KP`, 440, 595);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`%${roi} KAZANÇ ORANI`, 440, 635);

      // Predicted Side Badge
      ctx.fillStyle = side === "YES" ? "#10b981" : "#ef4444";
      ctx.fillRect(60, 700, 680, 80);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`TAHMİN: "${side === "YES" ? "EVET" : "HAYIR"}" DEDİ VE KAZANDI`, 400, 752);
      ctx.textAlign = "left";

      // Footer: Kahin Username + Signature
      ctx.fillStyle = "#e4e4e7";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`Kahin: @${username}`, 60, 840);

      ctx.fillStyle = "#71717a";
      ctx.font = "500 18px sans-serif";
      ctx.fillText("Türkiye'nin Sosyal Tahmin Borsası • kahin.app", 60, 880);

      // Download trigger
      const link = document.createElement("a");
      link.download = `kahin-ben-demistim-${username}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Visual Card (Live DOM Preview) */}
        <div
          ref={cardRef}
          className="p-6 md:p-8 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-900/90 border-4 border-zinc-800 m-3 rounded-2xl relative overflow-hidden"
        >
          {/* Subtle glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-emerald-400 font-black text-sm tracking-tight">
              🔮 KAHİN
            </div>
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
              Resmi Kanıt Kartı
            </div>
          </div>

          {/* Banner */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-amber-400 tracking-tight">BEN DEMİŞTİM!</span>
              <Flame className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Herkes yanılırken o bildi. Söz uçar, Kahin kanıtı kalır.
            </p>
          </div>

          {/* Question Box */}
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 mb-4">
            <h4 className="text-sm font-bold text-zinc-100 leading-snug">{title}</h4>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Giriş Oranı</div>
              <div
                className={`text-2xl font-black mt-0.5 ${
                  isSurprise ? "text-red-400" : "text-emerald-400"
                }`}
              >
                %{entryProbability.toFixed(1)}
              </div>
              <div className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                {isSurprise ? "🔥 İmkansızı Bildi!" : "🎯 İsabet"}
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Net Getiri</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                +{profit.toLocaleString("tr-TR")} KP
              </div>
              <div className="text-[10px] font-bold text-emerald-300 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> %{roi} ROI
              </div>
            </div>
          </div>

          {/* Outcome Badge */}
          <div
            className={`w-full py-2.5 rounded-xl text-center text-xs font-black uppercase tracking-wider text-white mb-4 ${
              side === "YES" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            "{side === "YES" ? "EVET" : "HAYIR"}" DEDİ VE KAZANDI ✅
          </div>

          {/* Footer Card */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/80 text-zinc-400">
            <div>
              Kahin: <strong className="text-zinc-200">@{username}</strong>
            </div>
            <div className="text-[10px] text-zinc-500">kahin.app</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full sm:flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Görsel Hazırlanıyor..." : "Görseli İndir (PNG)"}
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>

          <button
            onClick={handleShareTwitter}
            className="w-full sm:w-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            X Paylaş
          </button>
        </div>
      </div>
    </div>
  );
}
