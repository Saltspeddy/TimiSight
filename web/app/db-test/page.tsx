"use client";

import { useEffect, useState } from "react";

type DbStatus =
  | { state: "loading" }
  | { state: "connected"; serverTime: string }
  | { state: "error"; message: string };

export default function Home() {
  const [status, setStatus] = useState<DbStatus>({ state: "loading" });

  useEffect(() => {
    fetch("/api/db-test")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setStatus({ state: "connected", serverTime: data.serverTime });
        } else {
          setStatus({ state: "error", message: data.error });
        }
      })
      .catch((err) => setStatus({ state: "error", message: err.message }));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black font-sans">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 max-w-sm w-full shadow-sm text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
          Database Connection
        </h1>

        {status.state === "loading" && (
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
            <p>Connecting…</p>
          </div>
        )}

        {status.state === "connected" && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">✅</div>
            <p className="font-medium text-green-600">Connected to Supabase</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Server time:{" "}
              <span className="font-mono">
                {new Date(status.serverTime).toLocaleString()}
              </span>
            </p>
          </div>
        )}

        {status.state === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">❌</div>
            <p className="font-medium text-red-600">Connection failed</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono break-all">
              {status.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
