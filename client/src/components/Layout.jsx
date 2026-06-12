import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  CalendarCheck,
  ClipboardList,
  History,
  Bell,
  ScrollText,
  LogOut,
  Package,
  ScanLine,
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { useBadges } from "../lib/badges.jsx";
import { cn } from "../lib/utils.js";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "user"] },
  { to: "/assets", label: "Assets", icon: Boxes, roles: ["admin", "user"] },
  { to: "/my-bookings", label: "My Bookings", icon: CalendarCheck, roles: ["admin", "user"] },
  { to: "/approvals", label: "Approvals", icon: ClipboardList, roles: ["admin"], badge: "approvals", badgeStyle: "count" },
  { to: "/scan", label: "Scan", icon: ScanLine, roles: ["admin"] },
  { to: "/history", label: "History", icon: History, roles: ["admin"] },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "user"], badge: "notifications", badgeStyle: "dot" },
];

/** Small red count pill used to draw attention to pending items. */
function CountBadge({ count, className }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold leading-none text-white",
        "h-[18px]",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Minimal red dot — signals "there's something new" without a number. */
function Dot({ active, className }) {
  if (!active) return null;
  return (
    <span
      className={cn("h-2.5 w-2.5 rounded-full bg-rose-500", className)}
      aria-label="unread"
    />
  );
}

/** Renders the right badge style (count pill or minimal dot) for a nav item. */
function NavBadge({ item, counts, className }) {
  if (!item.badge) return null;
  const value = counts[item.badge];
  if (item.badgeStyle === "dot") {
    return <Dot active={value > 0} className={className} />;
  }
  return <CountBadge count={value} className={className} />;
}

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { counts } = useBadges();

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(isAdmin ? "admin" : "user")
  );

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Package size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">AssetFlow</p>
            <p className="text-xs text-slate-500">Cultural Council</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
              <NavBadge item={item} counts={counts} className="ml-auto" />
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-brand-600" />
            <span className="font-bold">AssetFlow</span>
          </div>
          <button onClick={handleLogout} className="text-slate-500">
            <LogOut size={18} />
          </button>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
          {visibleItems.map((item) => {
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "relative whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium",
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600"
                  )
                }
              >
                {item.label}
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
