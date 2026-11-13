"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | undefined;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

/** Sign in with email + password. */
export async function signIn(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const redirectTo = String(formData.get("redirectTo") ?? "/profile");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo || "/profile");
}

/** Sign up with email + password. */
export async function signUp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmations are enabled, there is no active session yet.
  if (data.user && !data.session) {
    redirect("/login?message=check-email");
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

/** Start the Google OAuth flow and redirect the browser to Google. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const redirectTo = String(formData.get("redirectTo") ?? "/profile");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
        redirectTo || "/profile"
      )}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}

/** Sign out and return to the home page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
