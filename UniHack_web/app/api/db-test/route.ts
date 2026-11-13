import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // getSession() is a lightweight call that just verifies the connection — no data needed.
  const { error } = await supabase.auth.getSession();

  if (error) {
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ connected: true, serverTime: new Date().toISOString() });
}
