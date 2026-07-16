"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setMsg(error.message);
        setBusy(false);
        return;
      }
      setMsg("If an account exists for that email, we've sent a password reset link.");
      setBusy(false);
      return;
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/account` },
      });
      if (error) {
        setMsg(error.message);
        setBusy(false);
        return;
      }
      if (!data.session) {
        setMsg("Almost there — check your email to confirm your account, then log in.");
        setMode("login");
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <section className="sec page-head">
      <div className="wrap" style={{ maxWidth: "460px" }}>
        <h1 className="display">
          {mode === "login" ? "Log in." : mode === "signup" ? "Create account." : "Reset password."}
        </h1>
        <p className="lede intro">
          {mode === "login"
            ? "Welcome back — log in to book your classes."
            : mode === "signup"
              ? "Set up your account once, then book in seconds next time."
              : "Enter your email and we'll send you a link to set a new password."}
        </p>

        <form className="auth" onSubmit={submit}>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}

          {mode === "login" && (
            <p className="auth__toggle" style={{ marginTop: "-.4rem" }}>
              <button type="button" onClick={() => { setMode("forgot"); setMsg(null); }}>
                Forgot your password?
              </button>
            </p>
          )}

          {msg && <p className="auth__msg">{msg}</p>}

          <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>

        <p className="auth__toggle">
          {mode === "forgot" ? (
            <button type="button" onClick={() => { setMode("login"); setMsg(null); }}>
              Back to log in
            </button>
          ) : (
            <>
              {mode === "login" ? "New here? " : "Already have an account? "}
              <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}>
                {mode === "login" ? "Create an account" : "Log in"}
              </button>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
