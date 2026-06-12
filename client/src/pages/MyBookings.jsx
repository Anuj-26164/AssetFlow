import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../components/toast.jsx";
import { useLiveRefresh } from "../lib/useLiveRefresh.js";
import { formatDate } from "../lib/utils.js";
import {
  Card,
  CardBody,
  Spinner,
  EmptyState,
  Button,
  StatusBadge,
  Select,
  ConfirmModal,
} from "../components/ui.jsx";

export default function MyBookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const params = status ? { status } : {};
      const res = await api.get("/bookings/me", { params });
      setBookings(res.data.bookings);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Reflect admin decisions (approved/rejected/issued/returned) live.
  useLiveRefresh(() => load({ silent: true }));

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${cancelTarget.id}/cancel`);
      toast.success("Booking cancelled");
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Bookings</h1>
          <p className="text-sm text-slate-500">Track the status of your asset requests.</p>
        </div>
        <Select className="w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="issued">Issued</option>
          <option value="returned">Returned</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings yet" description="Request an asset from the Assets page to get started." />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={b.status} />
                      <span className="text-sm text-slate-500">
                        {formatDate(b.startDate)} → {formatDate(b.endDate)}
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {b.items.map((item) => (
                        <li key={item.id}>
                          <span className="font-medium">{item.quantity}×</span> {item.asset.name}
                          <span className="text-slate-400"> ({item.asset.category?.name})</span>
                        </li>
                      ))}
                    </ul>
                    {b.issueReturn?.dueDate && (
                      <p className="text-xs text-slate-500">
                        Due back: {formatDate(b.issueReturn.dueDate)}
                        {b.issueReturn.returnedAt &&
                          ` • Returned ${formatDate(b.issueReturn.returnedAt)}`}
                      </p>
                    )}
                  </div>
                  {b.status === "pending" && (
                    <Button variant="secondary" size="sm" onClick={() => setCancelTarget(b)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel booking request?"
        message="This will withdraw your pending request. This action cannot be undone."
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        loading={cancelling}
        onConfirm={confirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
