import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "../auth/actions";
import { EmailForm, GoogleButton } from "../auth/components";
import { createClient } from "@/lib/supabase/server";
import "../auth/auth.css";

// This page reads the session cookie and searchParams at request time, so it
// blocks on the server rather than prerendering a static shell.
export const instant = false;

const MESSAGES: Record<string, string> = {
  "check-email": "Account created. Check your email to confirm your address, then sign in.",
};

const ERRORS: Record<string, string> = {
  "auth-callback-failed": "We couldn't finish signing you in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string; redirectTo?: string }>;
}) {
  // If already signed in, skip the login page.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/profile");

  const { message, error, redirectTo } = await searchParams;
  const notice = message ? MESSAGES[message] : undefined;
  const errorText = error ? ERRORS[error] ?? error : undefined;

  return (
    <div className="auth">
      <div className="auth-card">
        <Link className="auth-logo" href="/">UniPrep</Link>
        <h1>Welcome back</h1>
        <p className="sub">Sign in to continue.</p>

        {notice && <p className="auth-notice">{notice}</p>}
        {errorText && <p className="auth-error" role="alert">{errorText}</p>}

        <GoogleButton redirectTo={redirectTo} />

        <div className="auth-divider">or</div>

        <EmailForm action={signIn} mode="login" redirectTo={redirectTo} />

        <p className="auth-foot">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
