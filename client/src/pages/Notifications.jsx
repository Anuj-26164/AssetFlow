import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../components/toast.jsx";
import { useBadges } from "../lib/badges.jsx";
import { formatDateTime } from "../lib/utils.js";
import { Card, CardBody, Spinner, EmptyState, Button, Badge } from "../components/ui.jsx";

const TYPE_LABEL = {
  approval: "bg-emerald-100 text-emerald-700",
  rejection: "bg-rose-100 text-rose-700",
  due_soon: "bg-amber-100 text-amber-700",
  overdue: "bg-rose-100 text-rose-700",
};

export default function Notifications() {
  const toast = useToast();
  const { refresh } = useBadges();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      const list = res.data.notifications;
      setItems(list);
      // Visiting this page counts as "seeing" the notifications, so clear the
      // sidebar dot by marking everything read on the server. The list keeps
      // its unread highlights for this view so the user can still spot what's new.
      if (list.some((n) => !n.isRead)) {
        await api.patch("/notifications/read-all");
        refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await api.patch("/notifications/read-all");
    toast.success("All marked as read");
    await load();
    refresh();
  }

  async function markOne(id) {
    await api.patch(`/notifications/${id}/read`);
    await load();
    refresh();
  }

  const unread = items.filter((i) => !i.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={markAll}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.isRead ? "opacity-70" : ""}>
              <CardBody className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Bell size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={TYPE_LABEL[n.type] || "bg-slate-100 text-slate-600"}>
                        {n.type.replace("_", " ")}
                      </Badge>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markOne(n.id)}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
