import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaderboardRow, OfferRow, UserPoints } from "@/lib/shop";

/**
 * Data access for the shop / points system.
 *
 * Every function takes a Supabase client so the caller controls auth context:
 *   - pass a browser client (lib/supabase/client) in Client Components
 *   - pass a server client (lib/supabase/server) in Server Components / actions
 *
 * RLS does the rest: reads are scoped by the policies in schema.sql, and
 * redeem_offer() runs as SECURITY DEFINER with its own per-user lock.
 */

/** Active offers, cheapest first. Readable by anyone (RLS: active = true). */
export async function listOffers(sb: SupabaseClient): Promise<OfferRow[]> {
  const { data, error } = await sb
    .from("offers")
    .select("id, title, partner, kind, cost, stock, active")
    .eq("active", true)
    .order("cost", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OfferRow[];
}

/**
 * The signed-in user's points. Returns zeros when the user has no ledger rows
 * yet (the view simply has no row for them). Returns null when not signed in.
 */
export async function getMyPoints(
  sb: SupabaseClient
): Promise<UserPoints | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from("user_points")
    .select("user_id, balance, lifetime")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (
    (data as UserPoints | null) ?? {
      user_id: user.id,
      balance: 0,
      lifetime: 0,
    }
  );
}

/** Top players by lifetime points earned. */
export async function getLeaderboard(
  sb: SupabaseClient,
  limit = 20
): Promise<LeaderboardRow[]> {
  const { data, error } = await sb
    .from("leaderboard")
    .select("user_id, display_name, lifetime")
    .order("lifetime", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as LeaderboardRow[];
}

/**
 * The signed-in user's leaderboard standing: their lifetime points and 1-based
 * rank among everyone who has earned points. Returns null when not signed in or
 * when the user has not earned any points yet (no leaderboard row).
 */
export async function getMyRank(
  sb: SupabaseClient
): Promise<{ rank: number; lifetime: number } | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from("leaderboard")
    .select("user_id, lifetime")
    .order("lifetime", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { user_id: string; lifetime: number }[];
  const idx = rows.findIndex((r) => r.user_id === user.id);
  if (idx === -1) return null;
  return { rank: idx + 1, lifetime: rows[idx].lifetime };
}

export type RedeemResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

/**
 * Spend points for an offer via the redeem_offer() RPC. The database checks
 * the balance, decrements stock, writes the ledger + redemption rows, and
 * returns a one-time code — all atomically and double-tap safe.
 *
 * Known errors surfaced from the function: 'not signed in',
 * 'offer not available', 'not enough points', 'sold out'.
 */
export async function redeemOffer(
  sb: SupabaseClient,
  offerId: string
): Promise<RedeemResult> {
  const { data, error } = await sb.rpc("redeem_offer", { p_offer: offerId });

  if (error) return { ok: false, error: error.message };
  return { ok: true, code: String(data) };
}
