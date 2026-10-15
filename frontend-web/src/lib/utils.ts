import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKP(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return "0 KP";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0 KP";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num) + " KP";
}

export function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return "0";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPercent(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return "%0";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "%0";
  return `%${num.toFixed(1)}`;
}

export function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoStr;
  }
}

export function timeRemaining(closesAtIso: string): string {
  try {
    const closes = new Date(closesAtIso).getTime();
    const now = Date.now();
    const diff = closes - now;

    if (diff <= 0) return "Süresi Doldu";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 1) return `${days} gün kaldı`;
    if (days === 1) return `1 gün ${hours % 24} saat kaldı`;
    if (hours > 0) return `${hours} saat kaldı`;

    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} dakika kaldı`;
  } catch {
    return "Tarih belirsiz";
  }
}
