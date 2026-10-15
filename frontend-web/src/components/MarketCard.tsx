"use client";

import React from "react";
import Link from "next/link";
import { Market } from "@/lib/api";
import { formatKP, formatPercent, timeRemaining } from "@/lib/utils";
import { Clock, TrendingUp, ChevronRight } from "lucide-react";

interface MarketCardProps {
  market: Market;
}

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  FUTBOL: { label: "Futbol", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", icon: "⚽" },
  EKONOMI: { label: "Ekonomi", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400", icon: "📈" },
  MAGAZIN: { label: "Magazin", bg: "bg-fuchsia-500/10 border-fuchsia-500/20", text: "text-fuchsia-400", icon: "📸" },
  GUNDEM: { label: "Gündem", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", icon: "🌍" },
  KANKA: { label: "Kanka Ligi", bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", icon: "🤝" },
};

export function MarketCard({ market }: MarketCardProps) {
  const cat = CATEGORY_STYLES[market.category] || {
    label: market.category,
    bg: "bg-zinc-800 border-zinc-700",
    text: "text-zinc-300",
    icon: "🔥",
  };

  const yesPercent = Math.min(Math.max(market.yes_prob, 1), 99);
  const noPercent = 100 - yesPercent;

  return (
    <div className="group relative bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl p-5 shadow-lg shadow-black/40 transition-all duration-200 flex flex-col justify-between hover:-translate-y-0.5">
      <div>
        {/* Top bar: Category + Remaining Time */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.bg} ${cat.text}`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>

          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeRemaining(market.closes_at)}</span>
          </div>
        </div>

        {/* Title */}
        <Link href={`/m/${market.slug}`} className="block">
          <h3 className="font-bold text-base sm:text-lg text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
            {market.title}
          </h3>
        </Link>
      </div>

      <div className="mt-5 space-y-3.5">
        {/* Visual Probability Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-400">
              EVET {formatPercent(market.yes_prob)}
            </span>
            <span className="text-rose-400">
              HAYIR {formatPercent(market.no_prob)}
            </span>
          </div>

          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex p-0.5 gap-0.5">
            <div
              style={{ width: `${yesPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-l-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
            />
            <div
              style={{ width: `${noPercent}%` }}
              className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-r-full transition-all duration-500 shadow-sm shadow-rose-500/50"
            />
          </div>
        </div>

        {/* Action Buttons & Volume */}
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/m/${market.slug}?side=YES`}
            className="flex-1 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
          >
            <span>EVET Al</span>
            <span className="text-[10px] opacity-75">({formatPercent(market.yes_prob)})</span>
          </Link>

          <Link
            href={`/m/${market.slug}?side=NO`}
            className="flex-1 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
          >
            <span>HAYIR Al</span>
            <span className="text-[10px] opacity-75">({formatPercent(market.no_prob)})</span>
          </Link>
        </div>

        {/* Footer: Hacim + Detay Oku */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-medium">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
            <span>Hacim: <strong className="text-zinc-300 font-semibold">{formatKP(market.volume_kp)}</strong></span>
          </div>

          <Link
            href={`/m/${market.slug}`}
            className="inline-flex items-center gap-0.5 text-zinc-400 hover:text-emerald-400 transition"
          >
            <span>İncele</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
