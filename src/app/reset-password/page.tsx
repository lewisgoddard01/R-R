"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
    setTimeout(() => {
      router.push("/account");
      router.refresh();
    }, 1500);
  }

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "460px" }}>
        <h1 className="display">Set a new password.</h1>

        {done ? (
          <p className="lede intro">Password updated — taking you to your account…</p>
        ) : !ready ? (
          <p className="lede intro">
            Open this page from the reset-password link in your email to continue. If you&apos;re
            already here from that link, this will update automatically in a moment.
          </p>
        ) : (
          <>
            <p className="lede intro">Choose a new password for your account.</p>
            <form className="auth" onSubmit={submit}>
              <div className="field">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {msg && <p className="auth__msg">{msg}</p>}

              <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
                {busy ? "Please wait…" : "Set new password"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
