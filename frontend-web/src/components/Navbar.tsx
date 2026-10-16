"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthModal } from "@/components/AuthModal";
import { formatKP } from "@/lib/utils";
import {
  Coins,
  Gem,
  Flame,
  LifeBuoy,
  LogOut,
  User as UserIcon,
  Sparkles,
} from "lucide-react";

export function Navbar() {
  const { user, logout, claimDaily, claimBankruptcySupport } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [claiming, setClaiming] = useState(false);
  const [bonusToast, setBonusToast] = useState<string | null>(null);

  const handleClaimBonus = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await claimDaily();
      setBonusToast(`🎉 +${res.granted} KP Günlük Bonus alındı! (Seri: ${res.streak} gün)`);
      setTimeout(() => setBonusToast(null), 4000);
    } catch (err: unknown) {
      setBonusToast(err instanceof Error ? err.message : "Bonus alınamadı");
      setTimeout(() => setBonusToast(null), 4000);
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimBankruptcy = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await claimBankruptcySupport();
      setBonusToast(`🛡️ +${res.granted} KP İflas Destek Paketi cüzdanına eklendi!`);
      setTimeout(() => setBonusToast(null), 4000);
    } catch (err: unknown) {
      setBonusToast(err instanceof Error ? err.message : "İflas desteği alınamadı");
      setTimeout(() => setBonusToast(null), 4000);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
              <span className="text-lg">🔮</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  KAHİN
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  BETA
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 block -mt-1 font-medium hidden sm:block">
                Ben Demiştim!
              </span>
            </div>
          </Link>

          {/* Quick Category Nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-400">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/50 transition"
            >
              🔥 Trendler
            </Link>
            <Link
              href="/?cat=FUTBOL"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/50 transition"
            >
              ⚽ Futbol
            </Link>
            <Link
              href="/?cat=EKONOMI"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/50 transition"
            >
              📈 Ekonomi
            </Link>
            <Link
              href="/?cat=MAGAZIN"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/50 transition"
            >
              📸 Magazin
            </Link>
            <Link
              href="/?cat=GUNDEM"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/50 transition"
            >
              🌍 Gündem
            </Link>
            <div className="w-px h-5 bg-zinc-800 mx-1" />
            <Link
              href="/kanka-ligi"
              className="px-3 py-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>👥</span>
              <span>Kanka Ligi</span>
            </Link>
            <Link
              href="/siralama"
              className="px-3 py-1.5 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>🏆</span>
              <span>Sıralama</span>
            </Link>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                {/* Admin Panel Button if user is admin */}
                {user.is_admin && (
                  <a
                    href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:8501"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-red-500/30 border border-amber-500/40 text-amber-300 text-xs font-black transition shadow-sm animate-pulse"
                    title="Yönetici Paneline Git"
                  >
                    <span>👑</span>
                    <span className="hidden sm:inline">Yönetici Paneli</span>
                  </a>
                )}
                {/* Bankruptcy support pill if eligible (< 50 KP) */}
                {user.portfolio_value_kp < 50 && (
                  <button
                    onClick={handleClaimBankruptcy}
                    disabled={claiming}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold animate-pulse transition"
                    title="Portföyün 50 KP altına düştü, 200 KP destek paketi al!"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>+200 KP Destek</span>
                  </button>
                )}

                {/* Daily Bonus Button */}
                <button
                  onClick={handleClaimBonus}
                  disabled={claiming}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-semibold transition"
                  title="Günlük giriş bonusunu talep et"
                >
                  <Flame className="w-3.5 h-3.5 text-purple-400" />
                  <span>Seri: {user.streak_count}</span>
                </button>

                {/* KP Balance */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-full shadow-inner"
                  title={`Nakit: ${formatKP(user.kp_balance)} | Toplam Portföy: ${formatKP(user.portfolio_value_kp)}`}
                >
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs sm:text-sm text-emerald-400">
                    {formatKP(user.kp_balance)}
                  </span>
                </div>

                {/* Diamond Balance */}
                <div
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-semibold text-cyan-400"
                  title="Elmas Bakiyesi"
                >
                  <Gem className="w-3.5 h-3.5" />
                  <span>{user.diamond_balance}</span>
                </div>

                {/* User menu / tier badge */}
                <div className="flex items-center gap-2 pl-1">
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-xs font-semibold text-zinc-200 leading-tight">
                      {user.username}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">
                      {user.tier}
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-bold uppercase">
                    {user.username.slice(0, 2)}
                  </div>

                  <button
                    onClick={logout}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 rounded-lg transition"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthModalOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800/60 transition"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kayıt Ol</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Global Toast Message */}
        {bonusToast && (
          <div className="bg-emerald-600 text-white text-xs sm:text-sm font-medium py-1.5 px-4 text-center animate-in slide-in-from-top duration-200">
            {bonusToast}
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
