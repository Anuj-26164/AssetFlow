import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatDate, formatDateTime } from "../lib/utils.js";
import { Card, CardBody, Spinner, EmptyState, StatusBadge } from "../components/ui.jsx";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/history")
      .then((res) => setHistory(res.data.history))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">System Activity History</h1>
        <p className="text-sm text-slate-500">All booking activity across the organization.</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : history.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Assets</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((b) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3 text-slate-500">{formatDateTime(b.createdAt)}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{b.user?.name}</p>
                      <p className="text-xs text-slate-400">{b.user?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {b.items.map((i) => `${i.quantity}× ${i.asset.name}`).join(", ")}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {b.issueReturn?.returnedAt ? formatDate(b.issueReturn.returnedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
