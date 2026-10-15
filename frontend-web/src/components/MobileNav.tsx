"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Trophy, Users, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navItems = [
    { label: "Keşfet", href: "/", icon: Compass },
    { label: "Liderlik", href: "/siralama", icon: Trophy },
    { label: "Kanka Ligi", href: "/kanka-ligi", icon: Users },
    {
      label: "Portföyüm",
      href: user ? `/profil/${user.username}` : "#",
      icon: User,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              isActive
                ? "text-emerald-400 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
