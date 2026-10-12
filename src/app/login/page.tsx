"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  // Only ever follow a same-origin relative path — a bare "/" prevents
  // "//evil.example" (protocol-relative) and "https://evil.example" from
  // ever being used as an open redirect via a crafted login link.
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function resendConfirmation() {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setMsg(
      error
        ? `Couldn't resend just now (${error.message}). Please try again in a few minutes.`
        : `We've sent a new confirmation email to ${email}. Click the link in it, then log in. Check your junk or spam folder if it isn't in your inbox.`
    );
    setNeedsConfirm(false);
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setNeedsConfirm(false);

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
      // An email that's already registered comes back as a "user" with no
      // identities (so sign-up can't be used to check who has an account).
      // Telling them to check their email would leave them stuck.
      if (data.user && data.user.identities?.length === 0) {
        setMsg(
          "There's already an account with this email. Log in with your password, or use “Forgot your password?” to set a new one."
        );
        setMode("login");
        setBusy(false);
        return;
      }
      if (!data.session) {
        setMsg(
          `Almost there — we've emailed a confirmation link to ${email}. Click it, then log in. Check your junk or spam folder if it isn't in your inbox.`
        );
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
      if (error.code === "email_not_confirmed") {
        setMsg(
          "You haven't confirmed your email yet — click the link in the email we sent when you signed up (check junk/spam too)."
        );
        setNeedsConfirm(true);
      } else if (error.code === "invalid_credentials") {
        setMsg(
          "That email and password don't match. Check for typos (tap “Show” to see your password), or use “Forgot your password?” below to set a new one."
        );
      } else {
        setMsg(error.message);
      }
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
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{ background: "none", border: 0, color: "var(--orange)", padding: ".3rem 0", cursor: "pointer", fontSize: ".85rem" }}
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
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
          {needsConfirm && (
            <button type="button" className="btn btn--ghost btn--full" disabled={busy} onClick={resendConfirmation}>
              Resend confirmation email
            </button>
          )}

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
