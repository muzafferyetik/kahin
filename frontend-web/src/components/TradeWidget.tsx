"use client";

import React, { useState, useMemo } from "react";
import { Market, buyShares, sellShares } from "@/lib/api";
import { calculateBuyPreview, calculateSellPreview } from "@/lib/amm";
import { useAuthStore } from "@/store/useAuthStore";
import { formatKP, formatPercent } from "@/lib/utils";
import { AuthModal } from "@/components/AuthModal";
import { TrendingUp, ArrowDownRight, Wallet, CheckCircle2, AlertCircle } from "lucide-react";

interface TradeWidgetProps {
  market: Market;
  initialSide?: "YES" | "NO";
  onTradeSuccess?: () => void;
}

export function TradeWidget({
  market,
  initialSide = "YES",
  onTradeSuccess,
}: TradeWidgetProps) {
  const { user, refreshUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"BUY" | "SELL">("BUY");
  const [selectedSide, setSelectedSide] = useState<"YES" | "NO">(initialSide);
  const [amountStr, setAmountStr] = useState<string>("50");
  const [sellSharesStr, setSellSharesStr] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check if user has an existing position in this market
  const userPosition = useMemo(() => {
    if (!user || !user.positions) return null;
    return user.positions.find((p) => p.market_id === market.id && p.shares > 0) || null;
  }, [user, market.id]);

  const amountKp = parseFloat(amountStr) || 0;
  const sharesToSell = parseFloat(sellSharesStr) || 0;

  // Real-time AMM Calculation Preview (no server request needed)
  const buyPreview = useMemo(() => {
    return calculateBuyPreview(selectedSide, amountKp, market.yes_pool, market.no_pool);
  }, [selectedSide, amountKp, market.yes_pool, market.no_pool]);

  const sellPreview = useMemo(() => {
    if (!userPosition) return { payoutKp: 0, newYesProb: market.yes_prob, newNoProb: market.no_prob };
    return calculateSellPreview(userPosition.side, sharesToSell, market.yes_pool, market.no_pool);
  }, [userPosition, sharesToSell, market.yes_pool, market.no_pool]);

  const handleBuy = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    if (amountKp <= 0) {
      setErrorMsg("Lütfen geçerli bir yatırım miktarı girin.");
      return;
    }
    if (amountKp > user.kp_balance) {
      setErrorMsg("Yetersiz KP bakiyesi.");
      return;
    }

    setLoading(true);
    try {
      const res = await buyShares(market.id, selectedSide, amountKp);
      setSuccessMsg(`Başarılı! ${res.transaction.shares_bought.toFixed(2)} adet ${selectedSide} hissesi alındı.`);
      await refreshUser();
      if (onTradeSuccess) onTradeSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "İşlem sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!user || !userPosition) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (sharesToSell <= 0 || sharesToSell > userPosition.shares) {
      setErrorMsg("Lütfen geçerli bir satılacak hisse adedi girin.");
      return;
    }

    setLoading(true);
    try {
      const res = await sellShares(market.id, userPosition.side, sharesToSell);
      setSuccessMsg(`Başarılı! ${res.transaction.shares_sold.toFixed(2)} hisse satıldı ve +${res.transaction.payout_kp.toFixed(2)} KP hesabına geçti.`);
      await refreshUser();
      setSellSharesStr("0");
      if (onTradeSuccess) onTradeSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "İşlem sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl shadow-black/50 text-zinc-100 flex flex-col justify-between">
        <div>
          {/* Main Tabs: AL / BOZDUR */}
          <div className="flex p-1 bg-zinc-800/80 rounded-xl mb-4 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab("BUY");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === "BUY"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Hisse Satın Al
            </button>

            {userPosition && (
              <button
                onClick={() => {
                  setActiveTab("SELL");
                  setSellSharesStr(userPosition.shares.toString());
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === "SELL"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-amber-400/80 hover:text-amber-300"
                }`}
              >
                Hisse Bozdur (Cash-Out)
              </button>
            )}
          </div>

          {/* BUY MODE */}
          {activeTab === "BUY" && (
            <div className="space-y-4">
              {/* Side Selector: EVET vs HAYIR */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSide("YES")}
                  className={`py-3 px-3 rounded-xl border font-bold text-sm flex flex-col items-center gap-0.5 transition-all ${
                    selectedSide === "YES"
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950/50"
                      : "bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-base">EVET</span>
                  <span className="text-xs font-semibold opacity-80">
                    {formatPercent(market.yes_prob)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSide("NO")}
                  className={`py-3 px-3 rounded-xl border font-bold text-sm flex flex-col items-center gap-0.5 transition-all ${
                    selectedSide === "NO"
                      ? "bg-rose-600/20 border-rose-500 text-rose-400 shadow-md shadow-rose-950/50"
                      : "bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-base">HAYIR</span>
                  <span className="text-xs font-semibold opacity-80">
                    {formatPercent(market.no_prob)}
                  </span>
                </button>
              </div>

              {/* Investment Amount Input */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                  <span>Yatırılacak Tutar</span>
                  {user && (
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{formatKP(user.kp_balance)}</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                    KP
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[25, 50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountStr(preset.toString())}
                      className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg text-xs font-medium text-zinc-300 transition"
                    >
                      +{preset}
                    </button>
                  ))}
                  {user && (
                    <button
                      type="button"
                      onClick={() => setAmountStr(Math.floor(user.kp_balance).toString())}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg text-xs font-semibold text-emerald-400 transition"
                    >
                      Maks
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Calculation Summary Card */}
              <div className="p-3.5 bg-zinc-800/40 border border-zinc-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Alınacak Hisse:</span>
                  <span className="font-bold text-zinc-100">
                    {buyPreview.sharesReceived.toFixed(2)} Adet
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>Olası Kazanç (Bildinde):</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{buyPreview.potentialProfit.toFixed(2)} KP ({buyPreview.roiPercent > 0 ? `+${buyPreview.roiPercent}%` : "0%"})
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/80">
                  <span>Yeni Piyasa Oranı:</span>
                  <span className="font-medium text-zinc-300">
                    EVET %{buyPreview.newYesProb} / HAYIR %{buyPreview.newNoProb}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SELL MODE */}
          {activeTab === "SELL" && userPosition && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                <p className="font-semibold mb-0.5">Erken Bozdurma (Cash-Out)</p>
                <p className="opacity-90">
                  Elinizdeki {userPosition.side} hisselerini sonuçlanmayı beklemeden anlık orandan havuza satabilirsiniz.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                  <span>Satılacak Hisse Adedi</span>
                  <span>Eldeki: {userPosition.shares.toFixed(2)}</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    max={userPosition.shares}
                    step="0.1"
                    value={sellSharesStr}
                    onChange={(e) => setSellSharesStr(e.target.value)}
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                    Hisse
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setSellSharesStr((userPosition.shares * 0.25).toFixed(2))}
                    className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg text-xs text-zinc-300"
                  >
                    %25
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellSharesStr((userPosition.shares * 0.5).toFixed(2))}
                    className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg text-xs text-zinc-300"
                  >
                    %50
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellSharesStr(userPosition.shares.toFixed(2))}
                    className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg text-xs text-amber-400 font-semibold"
                  >
                    Tamamı
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-800/40 border border-zinc-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Hesaba Geçecek KP:</span>
                  <span className="font-bold text-amber-400 text-sm flex items-center gap-1">
                    <ArrowDownRight className="w-4 h-4" />
                    +{sellPreview.payoutKp.toFixed(2)} KP
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMsg && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Submit Action Button */}
        <div className="mt-5 pt-3 border-t border-zinc-800/80">
          {!user ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-950/40"
            >
              İşlem Yapmak İçin Giriş Yap
            </button>
          ) : activeTab === "BUY" ? (
            <button
              onClick={handleBuy}
              disabled={loading || amountKp <= 0}
              className={`w-full py-3 px-4 font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                selectedSide === "YES"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-950/40"
                  : "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-950/40"
              } disabled:opacity-50`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <span>
                  {amountKp > 0 ? `${amountKp} KP ile ${selectedSide} Hissesi Al` : "Yatırım Tutarı Girin"}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={handleSell}
              disabled={loading || sharesToSell <= 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{sharesToSell} Hisseyi Bozdur (+{sellPreview.payoutKp.toFixed(2)} KP)</span>
              )}
            </button>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="login"
      />
    </>
  );
}
