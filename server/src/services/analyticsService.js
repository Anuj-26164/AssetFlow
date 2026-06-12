import { prisma } from "../lib/prisma.js";

/** Start of the current day (local) — used to detect overdue returns. */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local YYYY-MM-DD key for bucketing by day. */
function dayKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getSummary() {
  const [
    pendingCount,
    approvedCount,
    issuedCount,
    assetAgg,
    totalAssets,
    overdue,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.booking.count({ where: { status: "approved" } }),
    prisma.booking.count({ where: { status: "issued" } }),
    prisma.asset.aggregate({
      _sum: { quantityAvailable: true, quantityTotal: true },
      where: { status: "active" },
    }),
    prisma.asset.count(),
    prisma.issueReturn.count({
      where: {
        returnedAt: null,
        dueDate: { lt: startOfToday() },
        booking: { status: "issued" },
      },
    }),
  ]);

  const available = assetAgg._sum.quantityAvailable ?? 0;
  const total = assetAgg._sum.quantityTotal ?? 0;

  return {
    pendingRequests: pendingCount,
    activeBookings: approvedCount + issuedCount,
    issuedBookings: issuedCount,
    availableUnits: available,
    totalUnits: total,
    unitsInUse: total - available,
    totalAssets,
    overdueReturns: overdue,
  };
}

/** Most-used assets + per-asset utilization rate. */
export async function getUtilization() {
  // Rank by total quantity actually booked. Only count bookings that were
  // genuinely fulfilled — exclude pending, rejected, and cancelled requests so
  // a rejected request never inflates utilization.
  const grouped = await prisma.bookingItem.groupBy({
    by: ["assetId"],
    where: { booking: { status: { in: ["approved", "issued", "returned"] } } },
    _sum: { quantity: true },
    _count: { _all: true },
  });

  const assets = await prisma.asset.findMany({ include: { category: true } });
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const bookedMap = new Map(grouped.map((g) => [g.assetId, g]));

  const utilization = assets
    .map((asset) => {
      const g = bookedMap.get(asset.id);
      const timesBooked = g?._count?._all ?? 0;
      const totalBookedUnits = g?._sum?.quantity ?? 0;
      const inUse = asset.quantityTotal - asset.quantityAvailable;
      const utilizationRate =
        asset.quantityTotal > 0 ? Math.round((inUse / asset.quantityTotal) * 100) : 0;
      return {
        assetId: asset.id,
        name: asset.name,
        category: asset.category?.name ?? null,
        quantityTotal: asset.quantityTotal,
        quantityAvailable: asset.quantityAvailable,
        unitsInUse: inUse,
        utilizationRate,
        timesBooked,
        totalBookedUnits,
      };
    })
    .sort((a, b) => b.totalBookedUnits - a.totalBookedUnits);

  // Category distribution for a pie chart.
  const byCategory = {};
  for (const asset of assets) {
    const key = asset.category?.name ?? "Uncategorized";
    byCategory[key] = (byCategory[key] ?? 0) + asset.quantityTotal;
  }
  const categoryDistribution = Object.entries(byCategory).map(([name, value]) => ({
    name,
    value,
  }));

  return { mostUsed: utilization.slice(0, 8), all: utilization, categoryDistribution };
}

/**
 * Advanced analytics: booking-activity trend over the last 30 days plus a
 * breakdown of bookings by lifecycle status.
 */
export async function getTrends() {
  const DAYS = 30;
  const since = startOfToday();
  since.setDate(since.getDate() - (DAYS - 1));

  const [recentBookings, statusGroups] = await Promise.all([
    prisma.booking.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  // Pre-fill every day in the window so the line chart has no gaps.
  const counts = {};
  const ordered = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = dayKey(d);
    counts[key] = 0;
    ordered.push(key);
  }

  for (const b of recentBookings) {
    const key = dayKey(b.createdAt);
    if (counts[key] !== undefined) counts[key] += 1;
  }

  const daily = ordered.map((key) => ({
    date: key,
    label: key.slice(5), // MM-DD for compact axis labels
    bookings: counts[key],
  }));

  const statusBreakdown = statusGroups.map((g) => ({
    status: g.status,
    count: g._count._all,
  }));

  return { daily, statusBreakdown };
}

/** System-wide activity history derived from bookings. */
export async function getHistory() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true } },
      items: { include: { asset: { select: { name: true } } } },
      issueReturn: true,
    },
  });
  return bookings;
}
