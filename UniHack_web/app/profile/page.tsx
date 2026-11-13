import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth/actions";
import "./profile.css";

// This page reads the authenticated user's session at request time, so it
// blocks on the server rather than prerendering a static shell.
export const instant = false;

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards /profile, but double-check here as well.
  if (!user) redirect("/login?redirectTo=/profile");

  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name || meta.name || "";
  const avatar: string | undefined = meta.avatar_url || meta.picture;
  const initial = (name || user.email || "?").charAt(0).toUpperCase();
  const provider = user.app_metadata?.provider ?? "email";
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="profile">
      <div className="profile-card">
        <div className="profile-top">
          <Link className="profile-logo" href="/">TimiSight</Link>
          <form action={signOut}>
            <button className="profile-logout" type="submit">Log out</button>
          </form>
        </div>

        <div className="profile-head">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="profile-avatar" src={avatar} alt={name || "Avatar"} />
          ) : (
            <div className="profile-avatar placeholder" aria-hidden="true">{initial}</div>
          )}
          <div>
            <h1>{name || "Your account"}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <h2>Account details</h2>
        <dl className="profile-details">
          <div>
            <dt>Name</dt>
            <dd>{name || <span className="muted">Not set</span>}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Sign-in method</dt>
            <dd className="cap">{provider}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{joined}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd className="mono">{user.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
