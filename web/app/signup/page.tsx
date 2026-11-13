import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "../auth/actions";
import { EmailForm, GoogleButton } from "../auth/components";
import { createClient } from "@/lib/supabase/server";
import "../auth/auth.css";

// This page reads the session cookie at request time to redirect signed-in
// users, so it blocks on the server rather than prerendering a static shell.
export const instant = false;

export default async function SignUpPage() {
  // If already signed in, skip the signup page.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/profile");

  return (
    <div className="auth">
      <div className="auth-card">
        <Link className="auth-logo" href="/">UniPrep</Link>
        <h1>Create your account</h1>
        <p className="sub">Join UniPrep in a few seconds.</p>

        <GoogleButton />

        <div className="auth-divider">or</div>

        <EmailForm action={signUp} mode="signup" />

        <p className="auth-foot">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
