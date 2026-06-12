import { useEffect, useState } from "react";
import { Check, X, PackageCheck, Undo2 } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../components/toast.jsx";
import { useBadges } from "../lib/badges.jsx";
import { useLiveRefresh } from "../lib/useLiveRefresh.js";
import { formatDate, todayISO } from "../lib/utils.js";
import {
  Card,
  CardBody,
  Spinner,
  EmptyState,
  Button,
  StatusBadge,
  Select,
  Modal,
  Input,
  Label,
  Textarea,
} from "../components/ui.jsx";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "issued", label: "Issued" },
  { key: "", label: "All" },
];

export default function Approvals() {
  const toast = useToast();
  const { refresh } = useBadges();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [issueModal, setIssueModal] = useState({ open: false, booking: null });
  const [returnModal, setReturnModal] = useState({ open: false, booking: null });

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const params = tab ? { status: tab } : {};
      const res = await api.get("/bookings", { params });
      setBookings(res.data.bookings);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Keep the queue live so new requests and the live "avail" counts stay current.
  useLiveRefresh(() => {
    load({ silent: true });
    refresh();
  });

  async function act(id, action, body) {
    try {
      await api.patch(`/bookings/${id}/${action}`, body);
      toast.success(`Booking ${action}d`);
      load();
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Approvals & Allocations</h1>
        <p className="text-sm text-slate-500">Review requests and manage the issue/return lifecycle.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState title="Nothing here" description="No bookings match this filter." />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={b.status} />
                      <span className="text-sm font-medium text-slate-800">{b.user?.name}</span>
                      <span className="text-xs text-slate-400">{b.user?.email}</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {b.items.map((item) => (
                        <li key={item.id}>
                          <span className="font-medium">{item.quantity}×</span> {item.asset.name}
                          <span className="text-slate-400">
                            {" "}
                            ({item.asset.quantityAvailable} avail)
                          </span>
                        </li>
                      ))}
                    </ul>
                    {b.issueReturn?.dueDate && (
                      <p className="text-xs text-slate-500">Due: {formatDate(b.issueReturn.dueDate)}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {b.status === "pending" && (
                      <>
                        <Button variant="success" size="sm" onClick={() => act(b.id, "approve")}>
                          <Check size={14} /> Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => act(b.id, "reject")}>
                          <X size={14} /> Reject
                        </Button>
                      </>
                    )}
                    {b.status === "approved" && (
                      <Button size="sm" onClick={() => setIssueModal({ open: true, booking: b })}>
                        <PackageCheck size={14} /> Issue
                      </Button>
                    )}
                    {b.status === "issued" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setReturnModal({ open: true, booking: b })}
                      >
                        <Undo2 size={14} /> Mark returned
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {issueModal.open && (
        <IssueModal
          booking={issueModal.booking}
          onClose={() => setIssueModal({ open: false, booking: null })}
          onDone={() => {
            setIssueModal({ open: false, booking: null });
            load();
          }}
        />
      )}
      {returnModal.open && (
        <ReturnModal
          booking={returnModal.booking}
          onClose={() => setReturnModal({ open: false, booking: null })}
          onDone={() => {
            setReturnModal({ open: false, booking: null });
            load();
          }}
        />
      )}
    </div>
  );
}

function IssueModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [dueDate, setDueDate] = useState(booking.endDate?.slice(0, 10) || todayISO());
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.patch(`/bookings/${booking.id}/issue`, { dueDate });
      toast.success("Asset issued");
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Issue asset"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Issuing..." : "Confirm issue"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Set the date the asset is expected back.</p>
        <div>
          <Label>Due date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function ReturnModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.patch(`/bookings/${booking.id}/return`, { conditionNote: note || null });
      toast.success("Marked returned — inventory restored");
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Mark as returned"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Confirm return"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Condition note (optional)</Label>
          <Textarea
            rows={3}
            placeholder="e.g. Returned in good condition"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
