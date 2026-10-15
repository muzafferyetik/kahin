"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon,
  Flame,
  Award,
  Sparkles,
  TrendingUp,
  Coins,
  Gem,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Share2,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Position, fetchMe } from "@/lib/api";
import { formatKP, formatNumber } from "@/lib/utils";
import { ProofCardModal } from "@/components/ProofCardModal";

const TIER_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  CAYLAK: { label: "Çaylak", color: "bg-zinc-800 text-zinc-300 border-zinc-700", desc: "Tahmin dünyasına yeni adım attı" },
  GOZLEMCI: { label: "Gözlemci", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", desc: "Oranları ve piyasaları yakından inceliyor" },
  ANALIST: { label: "Analist", color: "bg-teal-500/10 text-teal-400 border-teal-500/20", desc: "Veri ve istatistikle doğru tahminler yapıyor" },
  USTAT: { label: "Üstat", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", desc: "Yüksek keskinlik skoruyla topluluğa yön veriyor" },
  KAHINLER_MECLISI: { label: "Kahinler Meclisi", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", desc: "Türkiye Top 100 Kahinleri arasında" },
};

function ProfileContent() {
  const params = useParams();
  const usernameParam = (params?.username as string) || "";
  const { user, refreshUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"positions" | "badges" | "proofs">("positions");
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  useEffect(() => {
    refreshUser();
  }, []);

  const isMe = user && user.username.toLowerCase() === usernameParam.toLowerCase();
  const displayUser = isMe ? user : null;
  const tierInfo = TIER_CONFIG[displayUser?.tier || "CAYLAK"] || TIER_CONFIG.CAYLAK;

  const positions = displayUser?.positions || [];
  const surpriseWins = positions.filter((p) => p.avg_entry_probability < 40);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-zinc-950 font-black text-3xl shadow-lg shadow-emerald-500/20">
              {usernameParam.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-zinc-100">@{usernameParam}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{tierInfo.desc}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Flame className="w-3.5 h-3.5" /> {displayUser?.streak_count || 0} Gün Giriş Serisi
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-teal-400 font-bold">
                  Keskinlik: +{formatNumber(displayUser?.accuracy_score || 0)} P
                </span>
              </div>
            </div>
          </div>

          {/* Financial Balances Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-6">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Kullanılabilir Bakiye</span>
              <span className="text-xl font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <Coins className="w-5 h-5" /> {formatKP(displayUser?.kp_balance || 0)} KP
              </span>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Toplam Portföy</span>
              <span className="text-xl font-black text-zinc-200 flex items-center gap-1.5 mt-0.5">
                <TrendingUp className="w-5 h-5 text-teal-400" /> {formatKP(displayUser?.portfolio_value_kp || 0)} KP
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-zinc-800/80 mt-8 pt-4">
          <button
            onClick={() => setActiveTab("positions")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "positions"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Açık Hisseler ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("proofs")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "proofs"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Flame className="w-4 h-4" /> "Ben Demiştim!" Galerisi
          </button>
          <button
            onClick={() => setActiveTab("badges")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "badges"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Award className="w-4 h-4" /> Başarı Rozetleri
          </button>
        </div>
      </div>

      {/* Tab 1: Positions */}
      {activeTab === "positions" && (
        <div className="space-y-4">
          {positions.length === 0 ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
              <TrendingUp className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-200">Henüz açık bir hisseniz bulunmuyor</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Gündemdeki sorulara tahmin yaparak hisse alıp satmaya hemen başla!
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition"
              >
                Piyasaları Keşfet
              </Link>
            </div>
          ) : (
            positions.map((pos) => (
              <div
                key={`${pos.market_id}-${pos.side}`}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        pos.side === "YES"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {pos.side} HİSSESİ
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      Giriş Oranı: %{pos.avg_entry_probability.toFixed(1)}
                    </span>
                  </div>
                  <Link
                    href={`/m/${pos.slug}`}
                    className="text-base font-bold text-zinc-100 hover:text-emerald-400 transition block"
                  >
                    {pos.title}
                  </Link>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Hisse Adedi</span>
                    <span className="text-sm font-black text-zinc-200">
                      {pos.shares.toFixed(2)} Hisse
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Anlık Değer</span>
                    <span className="text-base font-black text-emerald-400">
                      {formatKP(pos.current_value_kp)}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedPosition(pos)}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kanıt Kartı</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Proof Card Gallery */}
      {activeTab === "proofs" && (
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-zinc-100">"Ben Demiştim!" Kanıt Kartları</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Özellikle %40'ın altındaki düşük ihtimalli sürprizleri bildiğinizde veya yüksek karlı pozisyonlarınızda ürettiğiniz resmi kanıt kartları burada listelenir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map((pos) => (
              <div
                key={`proof-${pos.market_id}`}
                className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 hover:border-amber-500/30 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                      RESMİ KANIT KARTI
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      {pos.side} • %{pos.avg_entry_probability.toFixed(1)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-200 line-clamp-2">{pos.title}</h4>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    Bozdurma: <strong className="text-emerald-400">{formatKP(pos.current_value_kp)}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedPosition(pos)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5" /> Kartı Aç
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Badges */}
      {activeTab === "badges" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: "İlk Kahinlik", desc: "Platformda ilk tahmin hissesini aldı", icon: Sparkles, earned: true },
            { title: "Seri Avcısı", desc: "7 gün kesintisiz giriş yaptı", icon: Flame, earned: (displayUser?.streak_count || 0) >= 7 },
            { title: "Sürpriz Kahini", desc: "%40'ın altındaki bir tahmini bildi", icon: Award, earned: surpriseWins.length > 0 },
            { title: "Kanka Ligi Baronu", desc: "Kanka Liginde birincilik elde etti", icon: ShieldCheck, earned: true },
            { title: "Derbi Üstadı", desc: "Futbol kategorisinde 1.000 KP üzeri kazandı", icon: TrendingUp, earned: false },
            { title: "Kahinler Meclisi", desc: "Türkiye Top 100 sıralamasına girdi", icon: Gem, earned: false },
          ].map((b) => (
            <div
              key={b.title}
              className={`p-5 rounded-2xl border transition ${
                b.earned
                  ? "bg-zinc-900/80 border-emerald-500/30 text-zinc-200"
                  : "bg-zinc-900/30 border-zinc-800/50 text-zinc-600 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    b.earned ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-600"
                  }`}
                >
                  <b.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-200">{b.title}</h4>
                  <span className="text-[10px] font-semibold text-emerald-400">
                    {b.earned ? "Kazanıldı ✅" : "Kilitli 🔒"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{b.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Proof Card Modal */}
      {selectedPosition && (
        <ProofCardModal
          isOpen={!!selectedPosition}
          onClose={() => setSelectedPosition(null)}
          title={selectedPosition.title}
          side={selectedPosition.side}
          entryProbability={selectedPosition.avg_entry_probability}
          investedKp={selectedPosition.total_invested_kp}
          payoutKp={selectedPosition.current_value_kp}
          username={usernameParam}
          slug={selectedPosition.slug}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500 text-xs">Yükleniyor...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
