import { create } from "zustand";
import {
  UserProfile,
  fetchMe,
  loginUser,
  registerUser,
  claimDailyBonus,
  claimBankruptcy,
} from "@/lib/api";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  login: (username: string, pass: string) => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  claimDaily: () => Promise<{ granted: number; streak: number }>;
  claimBankruptcySupport: () => Promise<{ granted: number }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  error: null,

  initAuth: async () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem("kahin_token");
    if (!token) {
      set({ token: null, user: null, isLoading: false });
      return;
    }
    set({ token, isLoading: true });
    try {
      const user = await fetchMe();
      set({ user, isLoading: false, error: null });
    } catch {
      localStorage.removeItem("kahin_token");
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (username, pass) => {
    set({ isLoading: true, error: null });
    try {
      const res = await loginUser(username, pass);
      localStorage.setItem("kahin_token", res.access_token);
      set({ token: res.access_token });
      const user = await fetchMe();
      set({ user, isLoading: false, error: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Giriş başarısız";
      set({ isLoading: false, error: msg });
      throw e;
    }
  },

  register: async (username, email, pass) => {
    set({ isLoading: true, error: null });
    try {
      const res = await registerUser(username, email, pass);
      localStorage.setItem("kahin_token", res.access_token);
      set({ token: res.access_token });
      const user = await fetchMe();
      set({ user, isLoading: false, error: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kayıt başarısız";
      set({ isLoading: false, error: msg });
      throw e;
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("kahin_token");
    }
    set({ token: null, user: null, error: null });
  },

  refreshUser: async () => {
    try {
      const user = await fetchMe();
      set({ user });
    } catch {
      // ignore
    }
  },

  claimDaily: async () => {
    const res = await claimDailyBonus();
    await get().refreshUser();
    return { granted: res.granted_kp, streak: res.streak_count };
  },

  claimBankruptcySupport: async () => {
    const res = await claimBankruptcy();
    await get().refreshUser();
    return { granted: res.granted_kp };
  },
}));
