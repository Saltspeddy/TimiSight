"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInWithGoogle, type AuthState } from "./actions";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="auth-btn" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <button className="auth-btn google" type="submit" disabled={pending}>
      <GoogleIcon />
      {pending ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}

export function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/profile"} />
      <GoogleSubmit />
    </form>
  );
}

type EmailFormProps = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  mode: "login" | "signup";
  redirectTo?: string;
};

export function EmailForm({ action, mode, redirectTo }: EmailFormProps) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, undefined);

  return (
    <form action={formAction}>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {mode === "signup" && (
        <div className="auth-field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" autoComplete="name" placeholder="Your name" />
        </div>
      )}

      <div className="auth-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
        />
      </div>

      <SubmitButton
        label={mode === "signup" ? "Create account" : "Sign in"}
        pendingLabel={mode === "signup" ? "Creating…" : "Signing in…"}
      />
    </form>
  );
}
