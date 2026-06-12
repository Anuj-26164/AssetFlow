import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatDateTime } from "../lib/utils.js";
import { Card, CardBody, Spinner, EmptyState, Badge } from "../components/ui.jsx";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/audit-logs")
      .then((res) => setLogs(res.data.logs))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500">Append-only trail of significant actions.</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-3 text-slate-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-5 py-3 text-slate-700">{log.actor?.name ?? "System"}</td>
                    <td className="px-5 py-3">
                      <Badge className="bg-brand-50 font-mono text-brand-700">{log.action}</Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{log.entity}</td>
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
