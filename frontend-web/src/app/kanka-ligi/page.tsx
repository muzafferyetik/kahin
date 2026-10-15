"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  Share2,
  Trophy,
  Flame,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useAuthStore } from "@/store/useAuthStore";
import {
  League,
  LeagueDetail,
  Market,
  createLeague,
  fetchMyLeagues,
  joinLeague,
  fetchLeagueDetail,
  createLeagueMarket,
  resolveLeagueMarket,
  resolveLeagueGroupMarkets,
} from "@/lib/api";
import { formatKP, formatNumber } from "@/lib/utils";

function KankaLigiContent() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code") || "";

  const { user } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [currentLeague, setCurrentLeague] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ranking" | "markets">("markets");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);

  // Form states
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState(urlCode);
  const [copiedCode, setCopiedCode] = useState(false);

  // New market form
  const [marketType, setMarketType] = useState<"binary" | "multi">("binary");
  const [marketTitle, setMarketTitle] = useState("");
  const [marketCriteria, setMarketCriteria] = useState("");
  const [marketClosesAt, setMarketClosesAt] = useState("");
  const [optionsList, setOptionsList] = useState<string[]>(["", "", ""]);

  // Multi-choice group resolution modal
  const [resolveGroupModal, setResolveGroupModal] = useState<{
    groupTitle: string;
    markets: Market[];
  } | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Load user's leagues
  const loadLeagues = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await fetchMyLeagues();
      setLeagues(list);

      // Select first league or URL code
      const targetCode = urlCode ? urlCode.toUpperCase() : list.length > 0 ? list[0].invite_code : "";
      if (targetCode) {
        setSelectedCode(targetCode);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, [user]);

  // Load details for selected league
  useEffect(() => {
    if (!selectedCode || !user) return;
    async function loadDetail() {
      try {
        const detail = await fetchLeagueDetail(selectedCode);
        setCurrentLeague(detail);
      } catch (err: any) {
        if (urlCode && selectedCode === urlCode.toUpperCase()) {
          setShowJoinModal(true);
          setJoinCodeInput(urlCode.toUpperCase());
        }
      }
    }
    loadDetail();
  }, [selectedCode, user]);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;
    try {
      setActionLoading(true);
      setActionError("");
      const created = await createLeague(newLeagueName.trim());
      setShowCreateModal(false);
      setNewLeagueName("");
      await loadLeagues();
      setSelectedCode(created.invite_code);
    } catch (err: any) {
      setActionError(err.message || "Lig oluşturulamadı.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    try {
      setActionLoading(true);
      setActionError("");
      const joined = await joinLeague(joinCodeInput.trim().toUpperCase());
      setShowJoinModal(false);
      setJoinCodeInput("");
      await loadLeagues();
      setSelectedCode(joined.invite_code);
    } catch (err: any) {
      setActionError(err.message || "Lige katılınamadı.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddOption = () => {
    if (optionsList.length < 6) {
      setOptionsList([...optionsList, ""]);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (optionsList.length > 3) {
      setOptionsList(optionsList.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...optionsList];
    updated[idx] = val;
    setOptionsList(updated);
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLeague || !marketTitle.trim() || !marketCriteria.trim() || !marketClosesAt) return;

    if (marketType === "multi") {
      const validOptions = optionsList.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 3) {
        setActionError("Çoktan seçmeli soru için en az 3 farklı seçenek girmelisiniz.");
        return;
      }
    }

    try {
      setActionLoading(true);
      setActionError("");
      const closesIso = new Date(marketClosesAt).toISOString();
      const validOptions = marketType === "multi" ? optionsList.map((o) => o.trim()).filter(Boolean) : undefined;

      await createLeagueMarket(currentLeague.league.invite_code, {
        title: marketTitle.trim(),
        resolution_criteria: marketCriteria.trim(),
        closes_at: closesIso,
        initial_pool: 1000,
        options: validOptions,
      });

      setShowMarketModal(false);
      setMarketTitle("");
      setMarketCriteria("");
      setMarketClosesAt("");
      setOptionsList(["", "", ""]);
      setMarketType("binary");

      // Refresh detail
      const detail = await fetchLeagueDetail(currentLeague.league.invite_code);
      setCurrentLeague(detail);
    } catch (err: any) {
      setActionError(err.message || "Soru oluşturulamadı.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveMarket = async (marketId: string, outcome: "YES" | "NO") => {
    if (!currentLeague) return;
    const confirm = window.confirm(
      `Bu soruyu "${outcome === "YES" ? "EVET" : "HAYIR"}" olarak sonuçlandırmak istiyor musunuz? Bu işlem geri alınamaz.`
    );
    if (!confirm) return;

    try {
      await resolveLeagueMarket(currentLeague.league.invite_code, marketId, outcome);
      const detail = await fetchLeagueDetail(currentLeague.league.invite_code);
      setCurrentLeague(detail);
    } catch (err: any) {
      alert(err.message || "Soru sonuçlandırılamadı.");
    }
  };

  const handleResolveGroup = async () => {
    if (!currentLeague || !resolveGroupModal || !selectedWinnerId) return;
    const winnerMarket = resolveGroupModal.markets.find((m) => m.id === selectedWinnerId);
    const winnerName = winnerMarket?.title.includes(" — ") ? winnerMarket.title.split(" — ")[1] : winnerMarket?.title;

    const confirm = window.confirm(
      `"${winnerName}" seçeneğini KAZANAN olarak belirlemek istiyor musunuz? Bu seçenek EVET olarak sonuçlandırılacak ve kazanan hisseler dağıtılacaktır.`
    );
    if (!confirm) return;

    try {
      setActionLoading(true);
      await resolveLeagueGroupMarkets(
        currentLeague.league.invite_code,
        selectedWinnerId,
        resolveGroupModal.markets.map((m) => m.id)
      );
      setResolveGroupModal(null);
      const detail = await fetchLeagueDetail(currentLeague.league.invite_code);
      setCurrentLeague(detail);
    } catch (err: any) {
      alert(err.message || "Grup sorusu sonuçlandırılamadı.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyInvite = () => {
    if (!currentLeague) return;
    const inviteLink = `${window.location.origin}/kanka-ligi?code=${currentLeague.league.invite_code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!currentLeague) return;
    const inviteLink = `${window.location.origin}/kanka-ligi?code=${currentLeague.league.invite_code}`;
    const text = encodeURIComponent(
      `🔥 Kahin'de "${currentLeague.league.name}" Kanka Ligimize katıl! Aramızda özel sorular açıp yarışıyoruz: ${inviteLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  // Group multi-choice questions smartly
  const groupedMarkets = useMemo(() => {
    if (!currentLeague) return [];
    const groups: { [key: string]: Market[] } = {};
    const standalone: Market[] = [];

    for (const m of currentLeague.markets) {
      if (m.title.includes(" — ")) {
        const base = m.title.split(" — ")[0].trim();
        if (!groups[base]) groups[base] = [];
        groups[base].push(m);
      } else {
        standalone.push(m);
      }
    }

    const result: Array<{ isMulti: boolean; baseTitle: string; markets: Market[] }> = [];

    for (const [baseTitle, mList] of Object.entries(groups)) {
      if (mList.length >= 2) {
        result.push({ isMulti: true, baseTitle, markets: mList });
      } else {
        result.push({ isMulti: false, baseTitle: mList[0].title, markets: mList });
      }
    }

    for (const s of standalone) {
      result.push({ isMulti: false, baseTitle: s.title, markets: [s] });
    }

    return result;
  }, [currentLeague]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">Kanka Ligi</h1>
        <p className="text-zinc-400 mt-2 max-w-md mx-auto text-sm leading-relaxed">
          Arkadaş grubunla özel ligini kur, aranızdaki iddialara ister 2 seçenekli (Evet/Hayır) ister 3+ seçenekli sorular aç ve kimin daha keskin olduğunu kanıtla!
        </p>
        <div className="mt-8">
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" /> 1.000 KP ile Hemen Başla
          </button>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode="register"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> Sosyal İddia Odaları
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-tight">Kanka Ligi</h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
            Arkadaşlarınla kapalı tahmin grubu kur, kendi özel Evet/Hayır veya çoktan seçmeli sorularını yönet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActionError("");
              setShowJoinModal(true);
            }}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold text-xs rounded-xl transition inline-flex items-center gap-2"
          >
            <LogIn className="w-4 h-4 text-emerald-400" /> Koda Göre Katıl
          </button>
          <button
            onClick={() => {
              setActionError("");
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Yeni Lig Kur
          </button>
        </div>
      </div>

      {/* Main Grid */}
      {leagues.length === 0 && !loading ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-200">Henüz bir Kanka Ligine üye değilsin</h3>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
            Arkadaşlarının davet kodunu girerek katılabilir veya kendi grubunu hemen oluşturabilirsin.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition"
            >
              Hemen Lig Oluştur
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition"
            >
              Koda Göre Katıl
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: My Leagues List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
              Liglerim ({leagues.length})
            </div>
            <div className="space-y-2">
              {leagues.map((l) => {
                const isSelected = selectedCode === l.invite_code;
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelectedCode(l.invite_code)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? "bg-zinc-900 border-emerald-500/50 shadow-md shadow-emerald-500/5"
                        : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-zinc-200 flex items-center gap-1.5">
                        {l.name}
                        {l.is_owner && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-medium">
                            Kurucu
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {l.member_count} üye • Kod: <span className="font-mono text-zinc-400">{l.invite_code}</span>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 transition ${
                        isSelected ? "text-emerald-400 translate-x-0.5" : "text-zinc-600"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Area: Selected League Details */}
          <div className="lg:col-span-3 space-y-6">
            {currentLeague ? (
              <>
                {/* League Header Card */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-zinc-100">{currentLeague.league.name}</h2>
                        {currentLeague.league.is_owner && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold">
                            Yönetici
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Kurucu: <span className="text-zinc-300 font-semibold">{currentLeague.league.owner_username}</span> • {currentLeague.members.length} / {currentLeague.league.max_members} Katılımcı
                      </p>
                    </div>

                    {/* Invite Share Widget */}
                    <div className="flex items-center gap-2">
                      <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Davet Kodu:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider">
                          {currentLeague.league.invite_code}
                        </span>
                        <button
                          onClick={copyInvite}
                          title="Davet Linkini Kopyala"
                          className="text-zinc-400 hover:text-zinc-200 transition ml-1"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        onClick={shareWhatsApp}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs rounded-lg transition inline-flex items-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex items-center justify-between border-t border-zinc-800/80 mt-5 pt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab("markets")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                          activeTab === "markets"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5" /> Grup Soruları ({groupedMarkets.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("ranking")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                          activeTab === "ranking"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5" /> Liderlik ({currentLeague.members.length})
                      </button>
                    </div>

                    {activeTab === "markets" && (
                      <button
                        onClick={() => {
                          setActionError("");
                          setShowMarketModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Soru Aç
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab: Markets */}
                {activeTab === "markets" && (
                  <div className="space-y-4">
                    {groupedMarkets.length === 0 ? (
                      <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
                        <Flame className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-zinc-300">Bu ligde henüz özel bir soru açılmamış</h4>
                        <p className="text-zinc-500 text-xs mt-1">
                          Arkadaşların arasında iddialaşmak için ilk soruyu hemen sen aç!
                        </p>
                        <button
                          onClick={() => setShowMarketModal(true)}
                          className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition"
                        >
                          Grup Sorusu Aç
                        </button>
                      </div>
                    ) : (
                      groupedMarkets.map((group, gIdx) => {
                        // Multi-choice Question Card
                        if (group.isMulti) {
                          const isAnyResolved = group.markets.some((m) => m.status.startsWith("RESOLVED"));
                          const canResolveGroup =
                            !isAnyResolved && (currentLeague.league.is_owner || user?.is_admin);

                          return (
                            <div
                              key={`group-${gIdx}`}
                              className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/80 transition space-y-4"
                            >
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold rounded flex items-center gap-1">
                                      <Layers className="w-3 h-3" /> ÇOKTAN SEÇMELİ ({group.markets.length} SEÇENEK)
                                    </span>
                                    {isAnyResolved && (
                                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">
                                        SONUÇLANDI ✅
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-base font-extrabold text-zinc-100">{group.baseTitle}</h3>
                                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                    {group.markets[0].resolution_criteria.replace(/\[Çoktan Seçmeli:.*?\]\n?/, "")}
                                  </p>
                                </div>
                              </div>

                              {/* Options Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                {group.markets.map((optMarket) => {
                                  const optName = optMarket.title.includes(" — ")
                                    ? optMarket.title.split(" — ")[1]
                                    : optMarket.title;
                                  const isWinner = optMarket.status === "RESOLVED_YES";

                                  return (
                                    <div
                                      key={optMarket.id}
                                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                                        isWinner
                                          ? "bg-emerald-500/10 border-emerald-500/40"
                                          : "bg-zinc-950/60 border-zinc-800"
                                      }`}
                                    >
                                      <div>
                                        <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                          <span>{optName}</span>
                                          {isWinner && (
                                            <span className="text-[9px] px-1 py-0.2 bg-emerald-500 text-zinc-950 font-black rounded">
                                              KAZANDI
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                                          %{optMarket.yes_prob.toFixed(1)} İhtimal
                                        </div>
                                      </div>
                                      <Link
                                        href={`/m/${optMarket.slug}`}
                                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition"
                                      >
                                        İşlem Yap
                                      </Link>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Multi-choice Resolution Trigger */}
                              {canResolveGroup && (
                                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">
                                    Lig Yöneticisi: Çoktan Seçmeli Sonuçlandırma
                                  </span>
                                  <button
                                    onClick={() => {
                                      setResolveGroupModal({
                                        groupTitle: group.baseTitle,
                                        markets: group.markets,
                                      });
                                      setSelectedWinnerId(group.markets[0].id);
                                    }}
                                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                                  >
                                    <Trophy className="w-3.5 h-3.5" /> Kazanan Seçeneği Belirle
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Single Binary Market Card
                        const m = group.markets[0];
                        const isResolved = m.status.startsWith("RESOLVED") || m.status === "CANCELLED";
                        const canResolve =
                          !isResolved && (currentLeague.league.is_owner || user?.is_admin);

                        return (
                          <div
                            key={m.id}
                            className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/80 transition"
                          >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold rounded">
                                    KANKA İDDİASI
                                  </span>
                                  {m.status === "RESOLVED_YES" && (
                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">
                                      EVET KAZANDI ✅
                                    </span>
                                  )}
                                  {m.status === "RESOLVED_NO" && (
                                    <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">
                                      HAYIR KAZANDI ❌
                                    </span>
                                  )}
                                  {m.status === "OPEN" && (
                                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 font-medium rounded flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-emerald-400" /> Canlı İddia
                                    </span>
                                  )}
                                </div>

                                <Link
                                  href={`/m/${m.slug}`}
                                  className="text-base font-bold text-zinc-100 hover:text-emerald-400 transition"
                                >
                                  {m.title}
                                </Link>
                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                  {m.resolution_criteria}
                                </p>
                              </div>

                              {/* Odds Badge */}
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-xs text-zinc-500 font-medium">Oranlar</div>
                                  <div className="text-sm font-black flex items-center gap-1.5 mt-0.5">
                                    <span className="text-emerald-400">E: %{m.yes_prob}</span>
                                    <span className="text-zinc-600">/</span>
                                    <span className="text-red-400">H: %{m.no_prob}</span>
                                  </div>
                                </div>

                                <Link
                                  href={`/m/${m.slug}`}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition"
                                >
                                  İşlem Yap
                                </Link>
                              </div>
                            </div>

                            {/* Resolution Controls for League Owner */}
                            {canResolve && (
                              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                                <span className="text-xs text-zinc-500">
                                  Lig Yöneticisi İşlemi: Sonuçlandır
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleResolveMarket(m.id, "YES")}
                                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg transition flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Evet Kazandı
                                  </button>
                                  <button
                                    onClick={() => handleResolveMarket(m.id, "NO")}
                                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg transition flex items-center gap-1"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Hayır Kazandı
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Tab: Leaderboard */}
                {activeTab === "ranking" && (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Kullanıcı</span>
                      <div className="flex items-center gap-6">
                        <span>Keskinlik</span>
                        <span>Bakiye (KP)</span>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-800/60">
                      {currentLeague.members.map((mem, index) => {
                        return (
                          <div
                            key={mem.user_id}
                            className={`px-5 py-3.5 flex items-center justify-between transition ${
                              mem.username === user.username
                                ? "bg-emerald-500/5 font-semibold"
                                : "hover:bg-zinc-800/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 text-center text-xs font-black ${
                                  index === 0
                                    ? "text-amber-400"
                                    : index === 1
                                    ? "text-zinc-300"
                                    : index === 2
                                    ? "text-amber-700"
                                    : "text-zinc-500"
                                }`}
                              >
                                #{index + 1}
                              </span>
                              <div>
                                <div className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                                  {mem.username}
                                  {mem.is_owner && (
                                    <span title="Kurucu">
                                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                    </span>
                                  )}
                                  {mem.username === user.username && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                                      Sen
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  {mem.tier} • {mem.streak_count} Gün Seri
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 text-right">
                              <span className="text-xs font-bold text-teal-400">
                                +{formatNumber(mem.accuracy_score)} P
                              </span>
                              <span className="text-sm font-black text-emerald-400">
                                {formatKP(mem.kp_balance)} KP
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs">Yükleniyor...</div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Yeni Lig Kur */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Yeni Kanka Ligi Kur
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Ligine özel bir isim ver. Oluşturulduktan sonra 6 haneli davet kodunu arkadaşlarınla paylaşabilirsin.
            </p>

            {actionError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateLeague} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Lig Adı
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Halı Saha Tayfası, Ofis Kahinleri"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition"
                >
                  {actionLoading ? "Oluşturuluyor..." : "Ligi Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Koda Göre Katıl */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-emerald-400" /> Kanka Ligine Katıl
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Arkadaşının seninle paylaştığı 6 haneli davet kodunu girerek lige katıl.
            </p>

            {actionError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleJoinLeague} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Davet Kodu
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 9X4KF8"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-center font-mono font-bold text-lg tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500 transition uppercase"
                  maxLength={10}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition"
                >
                  {actionLoading ? "Katılınıyor..." : "Lige Katıl"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Grup Sorusu Aç (2 Seçenek veya 3+ Çoktan Seçmeli) */}
      {showMarketModal && currentLeague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" /> Grup İçi Özel Soru Aç
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Bu soru yalnızca <strong className="text-zinc-200">{currentLeague.league.name}</strong> üyeleri tarafından görülebilir ve oynanabilir.
            </p>

            {actionError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateMarket} className="mt-4 space-y-4">
              {/* Question Format Toggle */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Soru Formatı
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMarketType("binary")}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      marketType === "binary"
                        ? "bg-emerald-500 text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Evet / Hayır (2 Seçenek)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketType("multi")}
                    className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      marketType === "multi"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Çoktan Seçmeli (3+ Seçenek)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Soru Başlığı (İddia Konusu)
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    marketType === "multi"
                      ? "Örn: Halı saha maçını kim kazanır?"
                      : "Örn: Halı saha maçında Ahmet 2 golden fazla atar mı?"
                  }
                  value={marketTitle}
                  onChange={(e) => setMarketTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Multi-choice Dynamic Option Fields */}
              {marketType === "multi" && (
                <div className="space-y-2 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Seçenekler (En az 3, en fazla 6)
                    </label>
                    {optionsList.length < 6 && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Seçenek Ekle
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    {optionsList.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-center text-xs font-bold text-zinc-500">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          required
                          placeholder={
                            idx === 0
                              ? "Örn: Galatasaray"
                              : idx === 1
                              ? "Örn: Fenerbahçe"
                              : idx === 2
                              ? "Örn: Berabere"
                              : `Seçenek ${idx + 1}`
                          }
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 transition"
                        />
                        {optionsList.length > 3 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition"
                            title="Seçeneği Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Sonuçlandırma Kriteri
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Örn: Maç sonu kalecilerin ortak mutabakatı ve video kaydı baz alınacaktır."
                  value={marketCriteria}
                  onChange={(e) => setMarketCriteria(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Tahmin Kapanış Tarihi & Saati
                </label>
                <input
                  type="datetime-local"
                  required
                  value={marketClosesAt}
                  onChange={(e) => setMarketClosesAt(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMarketModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition"
                >
                  {actionLoading ? "Açılıyor..." : "Soruyu Başlat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Çoktan Seçmeli Kazananı Belirle (Lig Sahibi) */}
      {resolveGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Kazanan Seçeneği Belirle
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              <strong className="text-zinc-200">{resolveGroupModal.groupTitle}</strong> sorusunun kazanan seçeneğini seçin. Kazanan seçenek <strong>EVET</strong>, diğerleri <strong>HAYIR</strong> olarak sonuçlandırılacaktır.
            </p>

            <div className="mt-4 space-y-2">
              {resolveGroupModal.markets.map((m) => {
                const optName = m.title.includes(" — ") ? m.title.split(" — ")[1] : m.title;
                const isSelected = selectedWinnerId === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-300"
                        : "bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="winner_choice"
                        checked={isSelected}
                        onChange={() => setSelectedWinnerId(m.id)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-bold">{optName}</span>
                    </div>
                    <span className="text-xs font-semibold text-zinc-500">%{m.yes_prob.toFixed(1)}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-5">
              <button
                type="button"
                onClick={() => setResolveGroupModal(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={actionLoading || !selectedWinnerId}
                onClick={handleResolveGroup}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {actionLoading ? "Sonuçlandırılıyor..." : "Kazananı Onayla & Dağıt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KankaLigiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500 text-xs">Yükleniyor...</div>}>
      <KankaLigiContent />
    </Suspense>
  );
}
