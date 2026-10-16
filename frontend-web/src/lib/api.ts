const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export interface Market {
  id: string;
  slug: string;
  title: string;
  category: "FUTBOL" | "MAGAZIN" | "GUNDEM" | "EKONOMI" | "KANKA";
  resolution_criteria: string;
  status: "OPEN" | "LOCKED" | "RESOLVED_YES" | "RESOLVED_NO" | "CANCELLED";
  yes_pool: number;
  no_pool: number;
  yes_prob: number;
  no_prob: number;
  volume_kp: number;
  closes_at: string;
  created_at: string;
}

export interface PricePoint {
  yes_prob: number;
  no_prob: number;
  volume_kp: number;
  recorded_at: string;
}

export interface Comment {
  id: string;
  username: string;
  user_side: "YES" | "NO";
  user_shares_snapshot: number;
  content: string;
  created_at: string;
}

export interface MarketDetail extends Market {
  price_history: PricePoint[];
  comments: Comment[];
}

export interface Position {
  market_id: string;
  slug: string;
  title: string;
  side: "YES" | "NO";
  shares: number;
  total_invested_kp: number;
  avg_entry_probability: number;
  current_value_kp: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  kp_balance: number;
  diamond_balance: number;
  accuracy_score: number;
  tier: string;
  streak_count: number;
  is_admin: boolean;
  portfolio_value_kp: number;
  positions: Position[];
}

export interface BuyResult {
  status: string;
  transaction: {
    shares_bought: number;
    entry_probability: number;
    remaining_kp_balance: number;
  };
  market_state: {
    yes_pool: number;
    no_pool: number;
    yes_prob: number;
    no_prob: number;
    volume_kp: number;
  };
}

export interface SellResult {
  status: string;
  transaction: {
    shares_sold: number;
    payout_kp: number;
    new_kp_balance: number;
  };
  market_state: {
    yes_pool: number;
    no_pool: number;
    yes_prob: number;
    no_prob: number;
  };
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("kahin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchMarkets(category?: string, sort: "popular" | "new" = "popular"): Promise<Market[]> {
  const url = new URL(`${API_BASE}/markets`);
  if (category && category !== "TÜMÜ") {
    url.searchParams.append("category", category);
  }
  url.searchParams.append("sort", sort);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Piyasalar yüklenemedi.");
  return res.json();
}

export async function fetchMarketDetail(slug: string): Promise<MarketDetail> {
  const res = await fetch(`${API_BASE}/markets/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Soru detayı bulunamadı.");
  return res.json();
}

export async function buyShares(marketId: string, side: "YES" | "NO", amountKp: number): Promise<BuyResult> {
  const res = await fetch(`${API_BASE}/trade/buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      market_id: marketId,
      side,
      amount_kp: amountKp,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "İşlem başarısız." }));
    throw new Error(error.detail || "Alım işlemi gerçekleştirilemedi.");
  }
  return res.json();
}

export async function sellShares(marketId: string, side: "YES" | "NO", sharesToSell: number): Promise<SellResult> {
  const res = await fetch(`${API_BASE}/trade/sell`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      market_id: marketId,
      side,
      shares_to_sell: sharesToSell,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "İşlem başarısız." }));
    throw new Error(error.detail || "Satış işlemi gerçekleştirilemedi.");
  }
  return res.json();
}

export async function loginUser(username: string, password: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Giriş başarısız." }));
    throw new Error(err.detail || "Kullanıcı adı veya şifre hatalı.");
  }
  return res.json();
}

export async function registerUser(username: string, email: string, password: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Kayıt başarısız." }));
    throw new Error(err.detail || "Kayıt işlemi başarısız.");
  }
  return res.json();
}

export async function fetchMe(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...getAuthHeaders() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Oturum doğrulanamadı.");
  return res.json();
}

export async function claimDailyBonus(): Promise<{ granted_kp: number; new_kp_balance: number; streak_count: number }> {
  const res = await fetch(`${API_BASE}/wallet/daily-bonus`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Bonus alınamadı." }));
    throw new Error(err.detail || "Günlük bonus talep edilemedi.");
  }
  return res.json();
}

export async function claimBankruptcy(): Promise<{ granted_kp: number; new_kp_balance: number }> {
  const res = await fetch(`${API_BASE}/wallet/bankruptcy-support`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "İflas desteği alınamadı." }));
    throw new Error(err.detail || "İflas desteği şartları sağlanmıyor.");
  }
  return res.json();
}

// ---------- Kanka Ligi ----------
export interface League {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  owner_username: string;
  max_members: number;
  member_count: number;
  is_owner: boolean;
  created_at: string;
}

export interface LeagueMember {
  user_id: string;
  username: string;
  tier: string;
  kp_balance: number;
  accuracy_score: number;
  streak_count: number;
  is_owner: boolean;
  joined_at: string;
}

export interface LeagueDetail {
  league: League;
  members: LeagueMember[];
  markets: Market[];
}

export async function createLeague(name: string): Promise<League> {
  const res = await fetch(`${API_BASE}/leagues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lig oluşturulamadı." }));
    throw new Error(err.detail || "Lig oluşturulamadı.");
  }
  return res.json();
}

export async function fetchMyLeagues(): Promise<League[]> {
  const res = await fetch(`${API_BASE}/leagues/my`, {
    headers: { ...getAuthHeaders() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Ligler yüklenemedi.");
  return res.json();
}

export async function joinLeague(inviteCode: string): Promise<League> {
  const res = await fetch(`${API_BASE}/leagues/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lige katılınamadı." }));
    throw new Error(err.detail || "Lige katılınamadı.");
  }
  return res.json();
}

export async function fetchLeagueDetail(inviteCode: string): Promise<LeagueDetail> {
  const res = await fetch(`${API_BASE}/leagues/${inviteCode}`, {
    headers: { ...getAuthHeaders() },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lig detayları alınamadı." }));
    throw new Error(err.detail || "Lig detayları alınamadı.");
  }
  return res.json();
}

export async function createLeagueMarket(
  inviteCode: string,
  data: { title: string; resolution_criteria: string; closes_at: string; initial_pool?: number; options?: string[] }
): Promise<Market> {
  const res = await fetch(`${API_BASE}/leagues/${inviteCode}/markets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lig sorusu açılamadı." }));
    throw new Error(err.detail || "Lig sorusu açılamadı.");
  }
  return res.json();
}

export async function resolveLeagueMarket(
  inviteCode: string,
  marketId: string,
  outcome: "YES" | "NO"
): Promise<{ status: string; outcome: string; winner_count: number; total_payout_kp: number }> {
  const res = await fetch(`${API_BASE}/leagues/${inviteCode}/markets/${marketId}/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ outcome }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Soru sonuçlandırılamadı." }));
    throw new Error(err.detail || "Soru sonuçlandırılamadı.");
  }
  return res.json();
}

export async function resolveLeagueGroupMarkets(
  inviteCode: string,
  winningMarketId: string,
  otherMarketIds: string[]
): Promise<{ status: string; winning_market: any; other_resolved_count: number }> {
  const res = await fetch(`${API_BASE}/leagues/${inviteCode}/markets/resolve-group`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      winning_market_id: winningMarketId,
      other_market_ids: otherMarketIds,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Grup sorusu sonuçlandırılamadı." }));
    throw new Error(err.detail || "Grup sorusu sonuçlandırılamadı.");
  }
  return res.json();
}

// ---------- Admin API ----------
export async function fetchAdminMarkets(): Promise<Market[]> {
  const res = await fetch(`${API_BASE}/admin/markets`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Admin piyasaları alınamadı." }));
    throw new Error(err.detail || "Admin piyasaları alınamadı.");
  }
  return res.json();
}

export async function createAdminMarket(data: {
  title: string;
  slug?: string;
  category: "FUTBOL" | "MAGAZIN" | "GUNDEM" | "EKONOMI";
  resolution_criteria: string;
  closes_at: string;
  initial_pool?: number;
  status?: "OPEN" | "DRAFT";
}): Promise<Market> {
  const res = await fetch(`${API_BASE}/admin/markets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Soru oluşturulamadı." }));
    throw new Error(err.detail || "Soru oluşturulamadı.");
  }
  return res.json();
}

export async function updateAdminMarketStatus(
  id: string,
  status: "LOCKED" | "CANCELLED"
): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/admin/markets/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Durum güncellenemedi." }));
    throw new Error(err.detail || "Durum güncellenemedi.");
  }
  return res.json();
}

export async function resolveAdminMarket(
  id: string,
  outcome: "YES" | "NO"
): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/admin/markets/${id}/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ outcome }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Soru sonuçlandırılamadı." }));
    throw new Error(err.detail || "Soru sonuçlandırılamadı.");
  }
  return res.json();
}

