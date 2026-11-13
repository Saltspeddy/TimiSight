import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getMyRank } from "@/lib/shop-db";
import ShopList from "./shop-list";
import "../account-pages.css";

// Reads the session to highlight the viewer on the leaderboard, so it renders
// per-request rather than as a static shell.
export const instant = false;

export default async function PlayPage() {
  const supabase = await createClient();
  const [{ data: { user } }, board, myRank] = await Promise.all([
    supabase.auth.getUser(),
    getLeaderboard(supabase, 50),
    getMyRank(supabase),
  ]);

  const meId = user?.id ?? null;
  const signedIn = !!user;
  const inList = meId ? board.some((r) => r.user_id === meId) : false;

  return (
    <div className="page">
      <div className="page-card wide">
        <div className="page-top">
          <Link className="page-logo" href="/">TimeHunt</Link>
          <nav className="page-nav" aria-label="Account">
            {signedIn ? (
              <Link href="/profile">← Back to account</Link>
            ) : (
              <Link href="/login?redirectTo=/play">Sign in</Link>
            )}
          </nav>
        </div>

        <h1>Shop &amp; leaderboard</h1>
        <p className="page-sub">
          Spend the points you earn exploring the city, and see where you stand.
        </p>

        <div className="play-grid">
          {/* Shop column (interactive) */}
          <section className="play-col">
            <h2>Points shop</h2>
            <ShopList />
          </section>

          {/* Leaderboard column (read-only) */}
          <section className="play-col">
            <h2>Leaderboard</h2>
            {board.length === 0 ? (
              <p className="muted" style={{ fontStyle: "italic" }}>
                No points earned yet. Be the first on the board.
              </p>
            ) : (
              <ol className="board-list">
                {board.map((r, i) => {
                  const me = r.user_id === meId;
                  return (
                    <li key={r.user_id} className={me ? "me" : ""}>
                      <span className="rank">{i + 1}</span>
                      <span className="who">{me ? "You" : r.display_name || "—"}</span>
                      <b>{r.lifetime} pts</b>
                    </li>
                  );
                })}
                {!inList && myRank && (
                  <li className="me outside">
                    <span className="rank">{myRank.rank}</span>
                    <span className="who">You</span>
                    <b>{myRank.lifetime} pts</b>
                  </li>
                )}
              </ol>
            )}
          </section>
        </div>

        <div className="play-foot">
          {signedIn ? (
            <Link className="profile-link-btn" href="/profile">← Back to account</Link>
          ) : (
            <Link className="profile-link-btn" href="/login?redirectTo=/play">Sign in</Link>
          )}
          <Link className="profile-link-btn ghost" href="/">Home</Link>
        </div>
      </div>
    </div>
  );
}
