import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";

const BadgeContext = createContext(null);

/**
 * Shared "attention" counts (unread notifications, pending approvals) used by
 * the sidebar badges. Polls every 30s, refetches on navigation, and exposes a
 * `refresh()` so pages can update the badges immediately after an action
 * (e.g. marking notifications read) without waiting for the next poll.
 */
export function BadgeProvider({ children }) {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({ notifications: 0, approvals: 0 });

  const refresh = useCallback(async () => {
    try {
      const requests = [api.get("/notifications")];
      if (isAdmin) requests.push(api.get("/bookings", { params: { status: "pending" } }));
      const [notifRes, pendingRes] = await Promise.all(requests);
      const unread = (notifRes.data.notifications ?? []).filter((n) => !n.isRead).length;
      const pending = pendingRes ? (pendingRes.data.bookings ?? []).length : 0;
      setCounts({ notifications: unread, approvals: pending });
    } catch {
      // Non-critical; keep previous counts.
    }
  }, [isAdmin]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, location.pathname]);

  return <BadgeContext.Provider value={{ counts, refresh }}>{children}</BadgeContext.Provider>;
}

export function useBadges() {
  return (
    useContext(BadgeContext) ?? { counts: { notifications: 0, approvals: 0 }, refresh: () => {} }
  );
}
