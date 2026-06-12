import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, PackageCheck, Undo2, Boxes } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../components/toast.jsx";
import { formatDate, todayISO } from "../lib/utils.js";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Spinner,
  Badge,
  StatusBadge,
  EmptyState,
} from "../components/ui.jsx";

const READER_ID = "qr-reader";

export default function Scan() {
  const toast = useToast();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const [result, setResult] = useState(null); // { asset, actionableBookings }
  const [loading, setLoading] = useState(false);

  // Ensure the camera is released if the user navigates away.
  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch {
        // ignore teardown errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function startScanner() {
    setResult(null);
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScanner();
          resolveCode(decodedText.trim());
        },
        () => {} // per-frame decode failures are normal; ignore
      );
      setScanning(true);
    } catch (err) {
      toast.error("Could not access camera. Use manual entry below.");
      await stopScanner();
    }
  }

  async function resolveCode(code) {
    if (!code) return;
    setLoading(true);
    try {
      const res = await api.get(`/assets/${code}/scan`);
      setResult(res.data);
      toast.success(`Resolved: ${res.data.asset.name}`);
    } catch (err) {
      toast.error(err.message || "Asset not found for that code");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (result?.asset) resolveCode(result.asset.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Scan Asset</h1>
        <p className="text-sm text-slate-500">
          Scan an asset's QR code to view details and process issue or return.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner / input */}
        <Card>
          <CardHeader>
            <CardTitle>Scanner</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div
              id={READER_ID}
              className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-slate-100"
              style={{ minHeight: scanning ? 240 : 0 }}
            />
            <div className="flex gap-2">
              {!scanning ? (
                <Button onClick={startScanner} className="flex-1">
                  <Camera size={16} /> Start camera
                </Button>
              ) : (
                <Button variant="secondary" onClick={stopScanner} className="flex-1">
                  <CameraOff size={16} /> Stop camera
                </Button>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Label>Or enter asset code manually</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste asset id from the QR"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <Button onClick={() => resolveCode(manualId.trim())} disabled={!manualId.trim()}>
                  Look up
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            ) : !result ? (
              <EmptyState
                title="Nothing scanned yet"
                description="Start the camera or enter an asset code to resolve it."
              />
            ) : (
              <ResolvedAsset result={result} onChanged={refresh} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ResolvedAsset({ result, onChanged }) {
  const toast = useToast();
  const { asset, actionableBookings } = result;

  async function act(bookingId, action, body) {
    try {
      await api.patch(`/bookings/${bookingId}/${action}`, body);
      toast.success(`Booking ${action}d`);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Boxes size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{asset.name}</h3>
          <p className="text-sm text-slate-500">{asset.category?.name}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold text-slate-800">{asset.quantityAvailable}</span>
            <span className="text-slate-400"> / {asset.quantityTotal} available</span>
          </p>
        </div>
      </div>

      <div>
        <Label>Actionable bookings</Label>
        {actionableBookings.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            No approved or issued bookings for this asset.
          </p>
        ) : (
          <div className="space-y-2">
            {actionableBookings.map((b) => (
              <BookingActionRow key={b.id} booking={b} onAct={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingActionRow({ booking, onAct }) {
  const [dueDate, setDueDate] = useState(booking.endDate?.slice(0, 10) || todayISO());

  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">{booking.user?.name}</p>
          <p className="text-xs text-slate-500">
            {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {booking.status === "approved" && (
        <div className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => onAct(booking.id, "issue", { dueDate })}>
            <PackageCheck size={14} /> Issue
          </Button>
        </div>
      )}

      {booking.status === "issued" && (
        <div className="mt-2 flex items-center justify-between">
          {booking.issueReturn?.dueDate && (
            <Badge className="bg-violet-100 text-violet-700">
              Due {formatDate(booking.issueReturn.dueDate)}
            </Badge>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAct(booking.id, "return", { conditionNote: null })}
          >
            <Undo2 size={14} /> Mark returned
          </Button>
        </div>
      )}
    </div>
  );
}
