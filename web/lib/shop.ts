import type { Lang } from "@/lib/site-data";

/**
 * Shop & points types + client helpers.
 *
 * The database side lives in supabase/schema.sql:
 *   - point_transactions  append-only points ledger (balance = sum of amount)
 *   - user_points         view: { user_id, balance, lifetime }
 *   - offers              shop catalogue
 *   - redemptions         a claimed offer + its one-time code
 *   - redeem_offer(uuid)  RPC that spends points atomically, returns a code
 *   - leaderboard         view: { user_id, display_name, lifetime }
 *
 * Points can never be added from the browser (no insert policy on the ledger);
 * earning goes through trusted server code calling award_points().
 */

export type OfferKind = "ticket" | "discount" | "event_promo" | "voucher";

/**
 * Presentation model for an offer card. The localized copy (title/desc/emoji)
 * is editorial and lives in the app; cost/kind/partner come from the DB row.
 */
export type Offer = {
  id: string;
  emoji: string;
  kind: OfferKind;
  partner: string;
  cost: number; // price in points
  title: Record<Lang, string>;
  desc: Record<Lang, string>;
};

/** A row from the `offers` table (source of truth for cost/stock/active). */
export type OfferRow = {
  id: string;
  title: string;
  partner: string | null;
  kind: string;
  cost: number;
  stock: number | null;
  active: boolean;
};

/** A row from the `leaderboard` view. */
export type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  lifetime: number;
};

/** A row from the `user_points` view. */
export type UserPoints = {
  user_id: string;
  balance: number;
  lifetime: number;
};
