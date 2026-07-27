"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const STORAGE_KEY = "rr-cookie-notice-dismissed";

// Minimal external store over localStorage. useSyncExternalStore (rather than
// useEffect + setState) is the supported way to read browser-only state
// without cascading renders or an SSR hydration mismatch.
let listeners: (() => void)[] = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
  };
}

function isDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Storage blocked (private mode etc.) — treat as dismissed rather than
    // showing a notice we can't remember dismissing.
    return true;
  }
}

/** Server render: assume dismissed so nothing is emitted during SSR and the
 *  client is free to reveal it after hydration without a mismatch. */
function isDismissedOnServer() {
  return true;
}

/** A plain informational notice — the site only sets a strictly-necessary
 *  login session cookie, which is exempt from consent under UK PECR, so this
 *  deliberately doesn't offer an accept/reject choice it wouldn't honour. */
export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, isDismissedOnServer);

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore — the notice still hides for this page view.
    }
    listeners.forEach((l) => l());
  }

  return (
    <div className="cookie-notice" role="region" aria-label="Cookie notice">
      <p>
        We only use essential cookies to keep you signed in — no tracking or advertising cookies.{" "}
        <Link href="/privacy">Read our privacy policy</Link>.
      </p>
      <button type="button" onClick={dismiss} className="btn btn--primary">
        Got it
      </button>
    </div>
  );
}
