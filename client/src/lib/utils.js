import clsx from "clsx";

export function cn(...inputs) {
  return clsx(...inputs);
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-rose-100 text-rose-700",
  issued: "bg-violet-100 text-violet-700",
  returned: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-600",
};

/** Today's date as YYYY-MM-DD for date inputs. */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
