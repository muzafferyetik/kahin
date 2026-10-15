"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatKP, formatNumber } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { Trophy, Flame, Target, ArrowLeft, Crown, Medal, Sparkles } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  user_id: string;
  username: string;
  tier: string;
  score: number;
  streak_count: number;
}

interface LeaderboardData {
  weekly_net_worth: LeaderboardUser[];
  global_accuracy: LeaderboardUser[];
}

const TIER_BADGES: Record<string, { label: string; color: string }> = {
  CAYLAK: { label: "Çaylak", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  GOZLEMCI: { label: "Gözlemci", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ANALIST: { label: "Analist", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  USTAT: { label: "Üstat", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  KAHINLER_MECLISI: { label: "Kahinler Meclisi", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"NET_WORTH" | "ACCURACY">("NET_WORTH");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";
        const res = await fetch(`${apiBase}/leaderboard`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const usersList =
    activeTab === "NET_WORTH"
      ? data?.weekly_net_worth || []
      : data?.global_accuracy || [];

  const top3 = usersList.slice(0, 3);
  const rest = usersList.slice(3);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Piyasalara Dön</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <Trophy className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Liderlik Tablosu</h1>
              <p className="text-xs text-zinc-400">Türkiye'nin en başarılı tahmincileri ve keskin kahinleri</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("NET_WORTH")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === "NET_WORTH"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Haftalık Portföy (KP)</span>
          </button>

          <button
            onClick={() => setActiveTab("ACCURACY")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === "ACCURACY"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Keskinlik Skoru</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-zinc-900 rounded-3xl" />
          <div className="h-80 bg-zinc-900 rounded-3xl" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {/* 2nd place */}
              {top3[1] && (
                <div className="order-2 sm:order-1 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 text-center flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-zinc-400/20 text-zinc-300 font-extrabold text-sm flex items-center justify-center border border-zinc-400/40">
                    2
                  </div>
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-400 flex items-center justify-center font-bold text-lg text-white">
                    {top3[1].username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm text-zinc-100">{top3[1].username}</span>
                  <span className="text-xs font-black text-zinc-300">
                    {activeTab === "NET_WORTH" ? formatKP(top3[1].score) : `${formatNumber(top3[1].score)} Puan`}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{top3[1].tier}</span>
                </div>
              )}

              {/* 1st place (Center & Elevated) */}
              {top3[0] && (
                <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-500/10 via-zinc-900 to-zinc-900 border-2 border-amber-500/40 rounded-3xl p-6 text-center flex flex-col items-center justify-center space-y-2.5 relative shadow-xl shadow-amber-950/20 sm:-translate-y-2">
                  <div className="absolute top-3 right-3 text-amber-400">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-zinc-950 font-black text-sm flex items-center justify-center shadow-md">
                    1
                  </div>
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-amber-400 flex items-center justify-center font-black text-xl text-amber-400 shadow-lg shadow-amber-500/20">
                    {top3[0].username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-extrabold text-base text-white">{top3[0].username}</span>
                  <span className="text-sm font-black text-amber-400">
                    {activeTab === "NET_WORTH" ? formatKP(top3[0].score) : `${formatNumber(top3[0].score)} Puan`}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                    {top3[0].tier}
                  </span>
                </div>
              )}

              {/* 3rd place */}
              {top3[2] && (
                <div className="order-3 sm:order-3 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 text-center flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 font-extrabold text-sm flex items-center justify-center border border-amber-700/40">
                    3
                  </div>
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-amber-700 flex items-center justify-center font-bold text-lg text-white">
                    {top3[2].username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm text-zinc-100">{top3[2].username}</span>
                  <span className="text-xs font-black text-amber-600/90">
                    {activeTab === "NET_WORTH" ? formatKP(top3[2].score) : `${formatNumber(top3[2].score)} Puan`}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{top3[2].tier}</span>
                </div>
              )}
            </div>
          )}

          {/* Full Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <span>Sıra & Kullanıcı</span>
              <div className="flex items-center gap-8">
                <span className="hidden sm:inline">Kademe</span>
                <span>{activeTab === "NET_WORTH" ? "Portföy Değeri" : "Keskinlik Skoru"}</span>
              </div>
            </div>

            <div className="divide-y divide-zinc-800/60">
              {usersList.map((u) => {
                const isMe = user?.username === u.username;
                const tierInfo = TIER_BADGES[u.tier] || { label: u.tier, color: "bg-zinc-800 text-zinc-400" };

                return (
                  <div
                    key={u.user_id}
                    className={`flex items-center justify-between p-4 sm:px-6 transition ${
                      isMe ? "bg-emerald-500/10 border-l-4 border-l-emerald-500" : "hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="w-6 text-center text-xs sm:text-sm font-bold text-zinc-400">
                        #{u.rank}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 uppercase">
                        {u.username.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-zinc-100">
                            {u.username}
                          </span>
                          {isMe && (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                              Sen
                            </span>
                          )}
                        </div>
                        {u.streak_count > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-purple-400 font-medium">
                            <Flame className="w-3 h-3" />
                            <span>{u.streak_count} Günlük Seri</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-8">
                      <span
                        className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierInfo.color}`}
                      >
                        {tierInfo.label}
                      </span>

                      <span className="text-xs sm:text-sm font-black text-emerald-400">
                        {activeTab === "NET_WORTH" ? formatKP(u.score) : `${formatNumber(u.score)} Puan`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
