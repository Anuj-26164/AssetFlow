import { useEffect, useRef } from "react";

/**
 * Keeps an open page in sync with server-side state without a manual refresh.
 *
 * Runs `callback` on a fixed interval and whenever the tab regains visibility
 * or the window regains focus. This is what makes things like inventory counts
 * (decremented when an admin approves a request) update live on a screen the
 * user already has open.
 *
 * The latest `callback` is always used, so it safely reads current state/filters
 * without needing to be memoized by the caller. Callbacks should refetch
 * silently (no full-page spinner) to avoid flicker on each tick.
 */
export function useLiveRefresh(callback, { interval = 15000 } = {}) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") savedCallback.current();
    };

    const id = setInterval(run, interval);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", run);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [interval]);
}
