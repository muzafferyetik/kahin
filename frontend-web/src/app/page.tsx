"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Market, fetchMarkets } from "@/lib/api";
import { MarketCard } from "@/components/MarketCard";
import { useMarketWebSocket } from "@/hooks/useWebSocket";
import { Flame, Sparkles, TrendingUp, Filter, RefreshCw, Users, Trophy } from "lucide-react";

const CATEGORIES = [
  { id: "TÜMÜ", label: "🔥 Tümü", filter: undefined },
  { id: "FUTBOL", label: "⚽ Futbol", filter: "FUTBOL" },
  { id: "EKONOMI", label: "📈 Ekonomi", filter: "EKONOMI" },
  { id: "MAGAZIN", label: "📸 Magazin", filter: "MAGAZIN" },
  { id: "GUNDEM", label: "🌍 Gündem", filter: "GUNDEM" },
];

export default function HomePage() {
  const [selectedCat, setSelectedCat] = useState("TÜMÜ");
  const [sort, setSort] = useState<"popular" | "new">("popular");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      const catFilter = CATEGORIES.find((c) => c.id === selectedCat)?.filter;
      const data = await fetchMarkets(catFilter, sort);
      setMarkets(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Piyasalar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
  }, [selectedCat, sort]);

  // Real-time WebSocket: when PRICE_TICK arrives, dynamically update the market in the list!
  useMarketWebSocket((tick) => {
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id === tick.market_id) {
          return {
            ...m,
            yes_prob: tick.yes_prob,
            no_prob: tick.no_prob,
            volume_kp: tick.volume_kp,
          };
        }
        return m;
      })
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Türkiye'nin Dinamik Oranlı Sosyal Tahmin Borsası</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Gündemi Tahmin Et, <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              "Ben Demiştim!"
            </span>{" "}
            Kartını Kap.
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
            Sabit oran yok, kasa yok. Oranları alım-satım talebi belirler. Maç veya olay sonuçlanmadan
            hisseni havuza geri satıp kârını anında realize edebilirsin.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/kanka-ligi"
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Kanka Ligi Kur & Davet Et</span>
            </Link>
            <Link
              href="/siralama"
              className="px-4 py-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 font-bold text-xs sm:text-sm rounded-xl border border-amber-500/30 transition flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Haftalık Liderlik Sıralaması</span>
            </Link>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400">
            <div className="flex items-center gap-1.5 bg-zinc-800/60 px-3 py-1.5 rounded-xl border border-zinc-700/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Canlı AMM Fiyatlama</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-800/60 px-3 py-1.5 rounded-xl border border-zinc-700/50">
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
              <span>Erken Satış (Cash-Out)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-800/60 px-3 py-1.5 rounded-xl border border-zinc-700/50">
              <span className="text-purple-400">🔒</span>
              <span>Sıfır Nakit Çıkışı (Zero Cash-Out)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Category Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                startTransition(() => {
                  setSelectedCat(cat.id);
                });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCat === cat.id
                  ? "bg-zinc-100 text-zinc-950 shadow-md"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex p-0.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSort("popular")}
              className={`px-3 py-1.5 rounded-lg transition ${
                sort === "popular"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🔥 Popüler
            </button>
            <button
              onClick={() => setSort("new")}
              className={`px-3 py-1.5 rounded-lg transition ${
                sort === "new"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ⚡ En Yeni
            </button>
          </div>

          <button
            onClick={loadMarkets}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse p-5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <p className="text-rose-400 text-sm mb-3">{error}</p>
          <button
            onClick={loadMarkets}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl"
          >
            Tekrar Dene
          </button>
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 space-y-2">
          <p className="text-zinc-300 font-bold text-base">Bu kategoride henüz soru bulunmuyor.</p>
          <p className="text-zinc-500 text-xs">Diğer kategorilere göz atabilir veya daha sonra tekrar deneyebilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
