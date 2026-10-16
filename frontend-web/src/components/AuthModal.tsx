"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { X, Sparkles, User, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(username, password);
        const loggedUser = useAuthStore.getState().user;
        if (loggedUser?.is_admin) {
          router.push("/admin");
        }
      } else {
        await register(username, email, password);
      }
      onClose();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "İşlem sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-zinc-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative ambient gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/80 border border-zinc-700/50 rounded-full text-xs font-medium text-emerald-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Yeni Üyelere 1.000 KP Başlangıç Hibesi
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === "login" ? "Kahin'e Giriş Yap" : "Kahin Hesabı Oluştur"}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Gündem tahmin borsasında yerini al, oranlar değişmeden hisseni kap.
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex p-1 bg-zinc-800/70 border border-zinc-700/40 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setLocalError(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "login"
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setLocalError(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "register"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Kayıt Ol (+1.000 KP)
          </button>
        </div>

        {/* Error alert */}
        {localError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Kullanıcı Adı {mode === "login" && "veya E-Posta"}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === "login" ? "Kullanıcı adı veya e-posta" : "kullanici_adi"}
                className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@kahin.com"
                  className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
              />
            </div>
            {mode === "login" && (
              <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center justify-between">
                <span>👑 Yönetici Hesabı:</span>
                <span className="font-mono text-amber-400 font-semibold">admin / admin12345</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Giriş Yap" : "Kayıt Ol ve 1.000 KP Al"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-6">
          Kahin platformunda gerçek para ile işlem yapılmaz. Tüm puanlar sanaldır (Zero Cash-Out).
        </p>
      </div>
    </div>
  );
}
