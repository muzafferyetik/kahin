"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchAdminMarkets,
  createAdminMarket,
  updateAdminMarketStatus,
  resolveAdminMarket,
  Market,
} from "@/lib/api";
import {
  ShieldAlert,
  Sparkles,
  Lock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Check,
  X,
} from "lucide-react";

export default function AdminPage() {
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"create" | "markets" | "resolve">("create");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"FUTBOL" | "MAGAZIN" | "GUNDEM" | "EKONOMI">("FUTBOL");
  const [initialPool, setInitialPool] = useState(1000);
  const [closeDate, setCloseDate] = useState("2026-10-20");
  const [closeTime, setCloseTime] = useState("20:00");
  const [resolutionCriteria, setResolutionCriteria] = useState("");

  // Resolve State
  const [selectedMarketId, setSelectedMarketId] = useState<string>("");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminMarkets();
      setMarkets(data);
      if (!selectedMarketId && data.length > 0) {
        const resolvable = data.find((m) => m.status === "OPEN" || m.status === "LOCKED");
        if (resolvable) setSelectedMarketId(resolvable.id);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Piyasalar yüklenemedi", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setCloseDate(d.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (user?.is_admin && token) {
      loadMarkets();
    }
  }, [user, token]);

  // Access check
  if (!user || !user.is_admin) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 rounded-2xl border border-red-500/30 bg-red-950/20 text-center backdrop-blur-md">
        <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-400 animate-bounce" />
        <h1 className="text-2xl font-black text-white mb-2">Yetkisiz Erişim</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Bu sayfaya yalnızca <strong>Yönetici (Admin)</strong> yetkisine sahip hesaplar erişebilir.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !resolutionCriteria.trim()) {
      showToast("Lütfen soru başlığı ve çözümleme kuralını eksiksiz doldurun.", "error");
      return;
    }

    try {
      setActionLoading("create");
      const closesAtIso = new Date(`${closeDate}T${closeTime}:00Z`).toISOString();
      await createAdminMarket({
        title: title.trim(),
        category,
        resolution_criteria: resolutionCriteria.trim(),
        closes_at: closesAtIso,
        initial_pool: initialPool,
        status: "OPEN",
      });
      showToast("🎉 Yeni piyasa başarıyla açıldı ve canlıya alındı!");
      setTitle("");
      setResolutionCriteria("");
      await loadMarkets();
      setActiveTab("markets");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Soru oluşturulamadı", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (marketId: string, newStatus: "LOCKED" | "CANCELLED") => {
    try {
      setActionLoading(marketId);
      await updateAdminMarketStatus(marketId, newStatus);
      showToast(
        newStatus === "LOCKED"
          ? "🔒 Piyasa kilitlendi (Alım-satım durduruldu)."
          : "❌ Piyasa iptal edildi ve tüm KP'ler kullanıcılara iade edildi."
      );
      await loadMarkets();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "İşlem başarısız", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (outcome: "YES" | "NO") => {
    if (!selectedMarketId) {
      showToast("Lütfen sonuçlandırılacak bir soru seçin", "error");
      return;
    }

    try {
      setActionLoading(`resolve-${selectedMarketId}`);
      await resolveAdminMarket(selectedMarketId, outcome);
      showToast(
        `🏆 Soru [${outcome}] olarak sonuçlandırıldı! Kazanan hisselere 1 KP ödendi ve keskinlik skorları güncellendi.`
      );
      await loadMarkets();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Sonuçlandırma hatası", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const selectedMarket = markets.find((m) => m.id === selectedMarketId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-sm font-semibold transition-all ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-red-950/90 border-red-500/50 text-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20">
            🔮
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              KAHİN — Yönetim & Operasyon Merkezi
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ADMIN
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Yeni piyasa açma, acil kilit ve kazananları belirleme (Resolution) paneli
            </p>
          </div>
        </div>

        <button
          onClick={loadMarkets}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Verileri Yenile
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === "create"
              ? "bg-zinc-800 text-amber-400 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          ✨ Yeni Soru Aç
        </button>
        <button
          onClick={() => setActiveTab("markets")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === "markets"
              ? "bg-zinc-800 text-amber-400 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Lock className="w-4 h-4" />
          🔒 Piyasalar & Kilit ({markets.length})
        </button>
        <button
          onClick={() => setActiveTab("resolve")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === "resolve"
              ? "bg-zinc-800 text-amber-400 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          🏆 Soru Sonuçlandırma
        </button>
      </div>

      {/* TAB 1: YENİ SORU AÇ */}
      {activeTab === "create" && (
        <form onSubmit={handleCreateMarket} className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>✨</span> Yeni Bir Tahmin Piyasası Başlat
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Soru Başlığı (Kullanıcıların göreceği başlık)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Bu hafta sonu Galatasaray - Fenerbahçe derbisinde kırmızı kart çıkar mı?"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="FUTBOL">⚽ Futbol</option>
                  <option value="EKONOMI">📈 Ekonomi</option>
                  <option value="MAGAZIN">🌟 Magazin</option>
                  <option value="GUNDEM">🏛️ Gündem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Başlangıç Havuzu (Her iki taraf için eşit KP)
                </label>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  step="100"
                  value={initialPool}
                  onChange={(e) => setInitialPool(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  1.000 KP havuz, ilk alım için dengeli bir oran kayması (slippage) sağlar.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Kapanış Tarihi</label>
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Kapanış Saati (UTC)</label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Çözümleme Kuralı (Resmi Kaynak & EVET Şartı)
                </label>
                <textarea
                  rows={4}
                  value={resolutionCriteria}
                  onChange={(e) => setResolutionCriteria(e.target.value)}
                  placeholder="Örn: TFF veya yayıncı kuruluş resmi maç raporuna göre 90 dakika ve uzatmalarda en az 1 kırmızı kart çıkarsa EVET sayılır."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={actionLoading === "create"}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading === "create" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Piyasa Başlatılıyor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  🚀 Piyasayı Başlat ve Yayına Al (OPEN)
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PİYASALAR & KİLİT */}
      {activeTab === "markets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Mevcut Piyasalar ({markets.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-500" />
              Piyasalar yükleniyor...
            </div>
          ) : markets.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 rounded-2xl bg-zinc-900/30 border border-zinc-800">
              Henüz soru bulunmuyor. Yeni Soru Aç sekmesinden ilk soruyu ekleyebilirsiniz.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {markets.map((m) => {
                const isResolving = actionLoading === m.id;
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {m.category}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            m.status === "OPEN"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : m.status === "LOCKED"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : m.status.startsWith("RESOLVED")
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {m.status}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Kapanış: {new Date(m.closes_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <Link
                        href={`/m/${m.slug}`}
                        className="text-sm font-semibold text-white hover:text-amber-400 transition block truncate"
                        title={m.title}
                      >
                        {m.title}
                      </Link>
                      <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <span>
                          EVET: <strong className="text-emerald-400">%{m.yes_prob.toFixed(1)}</strong> ({m.yes_pool.toLocaleString()} KP)
                        </span>
                        <span>
                          HAYIR: <strong className="text-rose-400">%{m.no_prob.toFixed(1)}</strong> ({m.no_pool.toLocaleString()} KP)
                        </span>
                        <span>Hacim: {m.volume_kp.toLocaleString()} KP</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {m.status === "OPEN" && (
                        <button
                          onClick={() => handleStatusChange(m.id, "LOCKED")}
                          disabled={isResolving}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Kilitle
                        </button>
                      )}
                      {(m.status === "OPEN" || m.status === "LOCKED") && (
                        <button
                          onClick={() => handleStatusChange(m.id, "CANCELLED")}
                          disabled={isResolving}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          İptal & İade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SORU SONUÇLANDIRMA */}
      {activeTab === "resolve" && (
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🏆</span> Soru Sonuçlandırma (Resolution)
            </h2>
            <p className="text-xs text-zinc-400">
              Sonuçlandırılan soruda kazanan tüm hisse sahiplerine anında <strong>1 Hisse = 1 KP</strong> ödenir ve Brier Keskinlik Skoru güncellenir.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Sonuçlandırılacak Soruyu Seçin:
            </label>
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-amber-500 transition"
            >
              <option value="">-- Soru Seçiniz --</option>
              {markets
                .filter((m) => m.status === "OPEN" || m.status === "LOCKED")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.status}] {m.title}
                  </option>
                ))}
            </select>
          </div>

          {selectedMarket && (
            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-4">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 mr-2">
                  {selectedMarket.category}
                </span>
                <span className="text-xs text-zinc-500">Durum: {selectedMarket.status}</span>
                <h3 className="text-base font-bold text-white mt-1.5">{selectedMarket.title}</h3>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300">
                <strong className="text-amber-400 block mb-1">Çözümleme Kuralı:</strong>
                {selectedMarket.resolution_criteria}
              </div>

              <div className="grid grid-cols-2 gap-3 text-center py-2">
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                  <div className="text-xs text-zinc-400 mb-0.5">EVET Olasılığı</div>
                  <div className="text-xl font-black text-emerald-400">%{selectedMarket.yes_prob.toFixed(1)}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20">
                  <div className="text-xs text-zinc-400 mb-0.5">HAYIR Olasılığı</div>
                  <div className="text-xl font-black text-rose-400">%{selectedMarket.no_prob.toFixed(1)}</div>
                </div>
              </div>

              {/* Big Resolution Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleResolve("YES")}
                  disabled={actionLoading === `resolve-${selectedMarket.id}`}
                  className="py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  ✅ EVET Kazandı (1 Hisse = 1 KP)
                </button>

                <button
                  onClick={() => handleResolve("NO")}
                  disabled={actionLoading === `resolve-${selectedMarket.id}`}
                  className="py-4 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm transition shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                  ❌ HAYIR Kazandı (1 Hisse = 1 KP)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
