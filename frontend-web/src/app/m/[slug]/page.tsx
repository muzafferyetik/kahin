"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MarketDetail, fetchMarketDetail, PricePoint } from "@/lib/api";
import { LiveChart } from "@/components/LiveChart";
import { TradeWidget } from "@/components/TradeWidget";
import { CommentSection } from "@/components/CommentSection";
import { useAuthStore } from "@/store/useAuthStore";
import { useMarketWebSocket } from "@/hooks/useWebSocket";
import { formatKP, formatPercent, formatDate, timeRemaining } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  HelpCircle,
  Share2,
  CheckCircle,
  Flame,
} from "lucide-react";
import { ProofCardModal } from "@/components/ProofCardModal";

function MarketDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || "";
  const initialSide = (searchParams?.get("side") as "YES" | "NO") || "YES";

  const { user } = useAuthStore();
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);

  const loadDetail = async () => {
    if (!slug) return;
    try {
      const data = await fetchMarketDetail(slug);
      setMarket(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Soru bulunamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [slug]);

  // Real-time WebSocket listener for live price ticks on this specific market
  useMarketWebSocket((tick) => {
    if (!market) return;
    if (tick.market_id === market.id || tick.slug === market.slug) {
      setMarket((prev) => {
        if (!prev) return prev;
        const newPoint: PricePoint = {
          yes_prob: tick.yes_prob,
          no_prob: tick.no_prob,
          volume_kp: tick.volume_kp,
          recorded_at: tick.timestamp || new Date().toISOString(),
        };
        return {
          ...prev,
          yes_prob: tick.yes_prob,
          no_prob: tick.no_prob,
          volume_kp: tick.volume_kp,
          price_history: [...prev.price_history, newPoint],
        };
      });
    }
  });

  const userPosition = useMemo(() => {
    if (!user || !user.positions || !market) return null;
    return user.positions.find((p) => p.market_id === market.id && p.shares > 0) || null;
  }, [user, market]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded-lg" />
        <div className="h-10 w-3/4 bg-zinc-800 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-zinc-900 rounded-2xl" />
          <div className="h-96 bg-zinc-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-zinc-100">Soru Bulunamadı</h2>
        <p className="text-sm text-zinc-400">{error || "Bu soru silinmiş veya yayından kaldırılmış olabilir."}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top Breadcrumb & Share */}
      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Piyasalara Dön</span>
        </Link>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition"
        >
          {copied ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Link Kopyalandı!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Soruyu Paylaş</span>
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Left Column (Chart & Details) + Right Column (TradeWidget) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                {market.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Kapanış: {timeRemaining(market.closes_at)} ({formatDate(market.closes_at)})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium ml-auto">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Toplam Hacim: <strong className="text-zinc-200">{formatKP(market.volume_kp)}</strong></span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {market.title}
            </h1>

            {/* Current Odds Big Bar */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-sm sm:text-base font-extrabold">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  EVET {formatPercent(market.yes_prob)}
                </span>
                <span className="text-rose-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  HAYIR {formatPercent(market.no_prob)}
                </span>
              </div>

              <div className="w-full h-3.5 bg-zinc-800 rounded-full overflow-hidden flex p-0.5 gap-1">
                <div
                  style={{ width: `${market.yes_prob}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-l-full transition-all duration-500 shadow-md shadow-emerald-500/50"
                />
                <div
                  style={{ width: `${market.no_prob}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-r-full transition-all duration-500 shadow-md shadow-rose-500/50"
                />
              </div>
            </div>
          </div>

          {/* Live Chart Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-200">Canlı İhtimal Grafiği</h3>
                <p className="text-xs text-zinc-500">TradingView altyapısıyla anlık EVET oranı zaman serisi</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-semibold text-emerald-400">Canlı Borsa</span>
              </div>
            </div>

            <LiveChart data={market.price_history} currentYesProb={market.yes_prob} />
          </div>

          {/* User Active Position Card (if held) */}
          {userPosition && (
            <div className="p-5 bg-gradient-to-r from-zinc-900 to-zinc-900/90 border border-emerald-500/30 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Bu Sorudaki Pozisyonunuz
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-black text-white">
                    {userPosition.shares.toFixed(2)} {userPosition.side} Hissesi
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    (Giriş Oranı: %{userPosition.avg_entry_probability.toFixed(1)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowProofModal(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>"Ben Demiştim!" Kartı</span>
                </button>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-zinc-400 block">Anlık Bozdurma Değeri</span>
                  <span className="text-base font-bold text-emerald-400">
                    {formatKP(userPosition.current_value_kp)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Criteria Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-2.5">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Çözümleme Kuralı (Ne Zaman EVET Sayılır?)</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-850 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
              {market.resolution_criteria}
            </p>
          </div>

          {/* Comments Section */}
          <CommentSection
            comments={market.comments}
            userPosition={userPosition}
            onPostComment={async (content) => {
              setMarket((prev) => {
                if (!prev || !user || !userPosition) return prev;
                return {
                  ...prev,
                  comments: [
                    {
                      id: String(Date.now()),
                      username: user.username,
                      user_side: userPosition.side,
                      user_shares_snapshot: userPosition.shares,
                      content,
                      created_at: new Date().toISOString(),
                    },
                    ...prev.comments,
                  ],
                };
              });
            }}
          />
        </div>

        {/* Right Column: Sticky Trade Widget */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <TradeWidget
            market={market}
            initialSide={initialSide}
            onTradeSuccess={() => {
              loadDetail();
            }}
          />
        </div>
      </div>

      {/* Proof Card Modal */}
      {userPosition && market && (
        <ProofCardModal
          isOpen={showProofModal}
          onClose={() => setShowProofModal(false)}
          title={market.title}
          side={userPosition.side}
          entryProbability={userPosition.avg_entry_probability}
          investedKp={userPosition.total_invested_kp}
          payoutKp={userPosition.current_value_kp}
          username={user?.username || "Kahin"}
          slug={market.slug}
        />
      )}
    </div>
  );
}

export default function MarketDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-zinc-800 rounded-lg" />
          <div className="h-10 w-3/4 bg-zinc-800 rounded-lg" />
        </div>
      }
    >
      <MarketDetailContent />
    </Suspense>
  );
}
