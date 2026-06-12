import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Boxes,
  CalendarClock,
  PackageCheck,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useLiveRefresh } from "../lib/useLiveRefresh.js";
import { Card, CardBody, CardHeader, CardTitle, Spinner, EmptyState } from "../components/ui.jsx";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const STATUS_COLORS = {
  pending: "#f59e0b",
  approved: "#3b82f6",
  issued: "#8b5cf6",
  returned: "#10b981",
  rejected: "#ef4444",
  cancelled: "#94a3b8",
};

function StatCard({ icon: Icon, label, value, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [trends, setTrends] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (isAdmin) {
          const [s, u, t] = await Promise.all([
            api.get("/analytics/summary"),
            api.get("/analytics/utilization"),
            api.get("/analytics/trends"),
          ]);
          setSummary(s.data);
          setUtilization(u.data);
          setTrends(t.data);
        } else {
          const res = await api.get("/bookings/me");
          setMyBookings(res.data.bookings);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  // Keep the snapshot current as bookings move through their lifecycle.
  useLiveRefresh(async () => {
    if (isAdmin) {
      const [s, u, t] = await Promise.all([
        api.get("/analytics/summary"),
        api.get("/analytics/utilization"),
        api.get("/analytics/trends"),
      ]);
      setSummary(s.data);
      setUtilization(u.data);
      setTrends(t.data);
    } else {
      const res = await api.get("/bookings/me");
      setMyBookings(res.data.bookings);
    }
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAdmin) {
    const active = myBookings.filter((b) => ["approved", "issued"].includes(b.status));
    const pending = myBookings.filter((b) => b.status === "pending");
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>
          <p className="text-sm text-slate-500">Here is a snapshot of your bookings.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Clock} label="Pending requests" value={pending.length} tone="amber" />
          <StatCard icon={PackageCheck} label="Active bookings" value={active.length} tone="emerald" />
          <StatCard icon={CalendarClock} label="Total bookings" value={myBookings.length} tone="brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Operations Dashboard</h1>
        <p className="text-sm text-slate-500">System-wide asset utilization and activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Clock} label="Pending requests" value={summary.pendingRequests} tone="amber" />
        <StatCard icon={PackageCheck} label="Active bookings" value={summary.activeBookings} tone="emerald" />
        <StatCard icon={Boxes} label="Available units" value={summary.availableUnits} tone="brand" />
        <StatCard icon={CalendarClock} label="Units in use" value={summary.unitsInUse} tone="violet" />
        <StatCard icon={AlertTriangle} label="Overdue returns" value={summary.overdueReturns} tone="rose" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Most Utilized Assets</CardTitle>
          </CardHeader>
          <CardBody>
            {utilization.mostUsed.length === 0 ? (
              <EmptyState title="No booking activity yet" description="Charts populate as bookings are made." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={utilization.mostUsed} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="totalBookedUnits" name="Units booked" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory by Category</CardTitle>
          </CardHeader>
          <CardBody>
            {utilization.categoryDistribution.length === 0 ? (
              <EmptyState title="No categories yet" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={utilization.categoryDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    label={(e) => e.name}
                    labelLine={false}
                    fontSize={11}
                  >
                    {utilization.categoryDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking Activity (last 30 days)</CardTitle>
          </CardHeader>
          <CardBody>
            {!trends || trends.daily.every((d) => d.bookings === 0) ? (
              <EmptyState title="No recent activity" description="New bookings will trend here." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends.daily} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings created"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
          </CardHeader>
          <CardBody>
            {!trends || trends.statusBreakdown.length === 0 ? (
              <EmptyState title="No bookings yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trends.statusBreakdown} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tick={{ fontSize: 11, textTransform: "capitalize" }}
                    width={70}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="Bookings" radius={[0, 4, 4, 0]}>
                    {trends.statusBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Utilization Rates</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Asset</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">In use / Total</th>
                <th className="px-5 py-3">Utilization</th>
                <th className="px-5 py-3">Times booked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {utilization.all.map((row) => (
                <tr key={row.assetId}>
                  <td className="px-5 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-5 py-3 text-slate-500">{row.category}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {row.unitsInUse} / {row.quantityTotal}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${row.utilizationRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{row.utilizationRate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.timesBooked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
