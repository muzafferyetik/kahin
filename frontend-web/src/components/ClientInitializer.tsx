"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export function ClientInitializer() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return null;
}
