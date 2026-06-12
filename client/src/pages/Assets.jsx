import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, CalendarPlus, Boxes, HeartPulse, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useToast } from "../components/toast.jsx";
import { useLiveRefresh } from "../lib/useLiveRefresh.js";
import { todayISO, formatDateTime } from "../lib/utils.js";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  Label,
  Badge,
  Spinner,
  EmptyState,
  Modal,
  Textarea,
  ConfirmModal,
} from "../components/ui.jsx";

const HEALTH_STYLES = {
  good: "bg-emerald-100 text-emerald-700",
  needs_repair: "bg-amber-100 text-amber-700",
  damaged: "bg-rose-100 text-rose-700",
};

const HEALTH_LABEL = {
  good: "Good",
  needs_repair: "Needs repair",
  damaged: "Damaged",
};

export default function Assets() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [availability, setAvailability] = useState("all");

  const [assetModal, setAssetModal] = useState({ open: false, editing: null });
  const [bookModal, setBookModal] = useState({ open: false, asset: null });
  const [healthModal, setHealthModal] = useState({ open: false, asset: null });
  const [qrModal, setQrModal] = useState({ open: false, asset: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCategories() {
    const res = await api.get("/categories");
    setCategories(res.data.categories);
  }

  async function loadAssets({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (availability === "available") params.availability = "available";
      const res = await api.get("/assets", { params });
      setAssets(res.data.assets);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // Debounce search + filter changes.
  useEffect(() => {
    const t = setTimeout(loadAssets, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, availability]);

  // Keep availability counts live: an admin approving a request elsewhere
  // decrements stock, and this reflects it without a manual refresh.
  useLiveRefresh(() => loadAssets({ silent: true }));

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/assets/${deleteTarget.id}`);
      toast.success("Asset deleted");
      setDeleteTarget(null);
      loadAssets();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assets</h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? "Manage inventory and availability." : "Browse and request available assets."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAssetModal({ open: true, editing: null })}>
            <Plus size={16} /> Add asset
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="all">All assets</option>
            <option value="available">Available only</option>
          </Select>
        </CardBody>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          title="No assets found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Boxes size={20} />
                  </div>
                  <Badge
                    className={
                      asset.status === "retired"
                        ? "bg-slate-200 text-slate-600"
                        : asset.quantityAvailable > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }
                  >
                    {asset.status === "retired"
                      ? "retired"
                      : asset.quantityAvailable > 0
                      ? "available"
                      : "out of stock"}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-800">{asset.name}</h3>
                <p className="text-xs text-slate-500">{asset.category?.name}</p>
                {asset.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{asset.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{asset.quantityAvailable}</span>
                  <span className="text-slate-400">/ {asset.quantityTotal} available</span>
                  {asset.healthLogs?.[0] && (
                    <Badge className={`ml-auto ${HEALTH_STYLES[asset.healthLogs[0].condition]}`}>
                      {HEALTH_LABEL[asset.healthLogs[0].condition]}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  {isAdmin ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setAssetModal({ open: true, editing: asset })}
                      >
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        title="Health log"
                        onClick={() => setHealthModal({ open: true, asset })}
                      >
                        <HeartPulse size={14} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        title="QR code"
                        onClick={() => setQrModal({ open: true, asset })}
                      >
                        <QrCode size={14} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(asset)}>
                        <Trash2 size={14} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={asset.status === "retired" || asset.quantityAvailable === 0}
                      onClick={() => setBookModal({ open: true, asset })}
                    >
                      <CalendarPlus size={14} /> Request
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {assetModal.open && (
        <AssetFormModal
          editing={assetModal.editing}
          categories={categories}
          onClose={() => setAssetModal({ open: false, editing: null })}
          onSaved={() => {
            setAssetModal({ open: false, editing: null });
            loadAssets();
          }}
        />
      )}

      {bookModal.open && (
        <BookingModal
          asset={bookModal.asset}
          onClose={() => setBookModal({ open: false, asset: null })}
          onBooked={() => setBookModal({ open: false, asset: null })}
        />
      )}

      {healthModal.open && (
        <HealthModal
          asset={healthModal.asset}
          onClose={() => setHealthModal({ open: false, asset: null })}
          onLogged={() => {
            setHealthModal({ open: false, asset: null });
            loadAssets();
          }}
        />
      )}

      {qrModal.open && (
        <QrModal asset={qrModal.asset} onClose={() => setQrModal({ open: false, asset: null })} />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete asset?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Keep"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AssetFormModal({ editing, categories, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    categoryId: editing?.categoryId ?? categories[0]?.id ?? "",
    description: editing?.description ?? "",
    quantityTotal: editing?.quantityTotal ?? 1,
    status: editing?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        categoryId: form.categoryId,
        description: form.description || null,
        quantityTotal: Number(form.quantityTotal),
        status: form.status,
      };
      if (editing) {
        await api.put(`/assets/${editing.id}`, payload);
        toast.success("Asset updated");
      } else {
        await api.post("/assets", payload);
        toast.success("Asset created");
      }
      onSaved();
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
      title={editing ? "Edit asset" : "Add asset"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.categoryId}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Total quantity</Label>
            <Input
              type="number"
              min={0}
              value={form.quantityTotal}
              onChange={(e) => update("quantityTotal", e.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </Select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function BookingModal({ asset, onClose, onBooked }) {
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function handleBook() {
    setSaving(true);
    try {
      await api.post("/bookings", {
        startDate,
        endDate,
        items: [{ assetId: asset.id, quantity: Number(quantity) }],
      });
      toast.success("Booking request submitted");
      onBooked();
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
      title={`Request "${asset.name}"`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleBook} disabled={saving}>
            {saving ? "Submitting..." : "Submit request"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {asset.quantityAvailable} unit(s) currently available.
        </p>
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            max={asset.quantityAvailable}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start date</Label>
            <Input type="date" value={startDate} min={todayISO()} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function HealthModal({ asset, onClose, onLogged }) {
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState("good");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/assets/${asset.id}/health`);
      setHistory(res.data.history);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setSaving(true);
    try {
      await api.post(`/assets/${asset.id}/health`, { condition, note: note || null });
      toast.success("Condition logged");
      setNote("");
      await load();
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
      title={`Health — ${asset.name}`}
      footer={
        <Button variant="secondary" onClick={onLogged}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Log a new condition */}
        <div className="rounded-lg border border-slate-200 p-3">
          <Label>Log current condition</Label>
          <div className="flex gap-2">
            <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="good">Good</option>
              <option value="needs_repair">Needs repair</option>
              <option value="damaged">Damaged</option>
            </Select>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving..." : "Log"}
            </Button>
          </div>
          <Textarea
            className="mt-2"
            rows={2}
            placeholder="Optional note (e.g. lens scratch, replaced battery)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* History */}
        <div>
          <Label>Condition history</Label>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : history.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No condition logged yet.</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div>
                    <Badge className={HEALTH_STYLES[h.condition]}>{HEALTH_LABEL[h.condition]}</Badge>
                    {h.note && <p className="mt-1 text-sm text-slate-600">{h.note}</p>}
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {formatDateTime(h.loggedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function QrModal({ asset, onClose }) {
  // The QR encodes the asset's stable UUID; the Scan page resolves it to the
  // asset and its actionable bookings.
  function handlePrint() {
    const svg = document.getElementById("asset-qr")?.outerHTML ?? "";
    const win = window.open("", "_blank", "width=420,height=520");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>${asset.name} — QR</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 24px;">
          ${svg}
          <h2 style="margin: 16px 0 4px;">${asset.name}</h2>
          <p style="color:#64748b; margin:0;">${asset.category?.name ?? ""}</p>
          <p style="color:#94a3b8; font-size:12px; margin-top:8px;">${asset.id}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`QR code — ${asset.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint}>Print</Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <QRCodeSVG id="asset-qr" value={asset.id} size={200} level="M" includeMargin />
        </div>
        <p className="text-sm font-medium text-slate-700">{asset.name}</p>
        <p className="text-xs text-slate-400">{asset.id}</p>
        <p className="text-center text-xs text-slate-500">
          Print and attach to the physical asset. Scan it from the Scan page to issue or return.
        </p>
      </div>
    </Modal>
  );
}
