import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { recordAudit } from "./auditService.js";
import { notify } from "./notificationService.js";

const bookingInclude = {
  items: { include: { asset: { include: { category: true } } } },
  user: { select: { id: true, name: true, email: true } },
  reviewer: { select: { id: true, name: true, email: true } },
  issueReturn: true,
};

/**
 * Create a pending booking request.
 *
 * Per the integrity strategy, inventory is NOT reserved at request time — it is
 * only decremented on approval inside a locked transaction. Here we do a soft
 * availability check so users get immediate feedback, and validate assets.
 */
export async function createBooking(userId, { startDate, endDate, items }) {
  // Collapse duplicate asset lines into a single quantity.
  const merged = new Map();
  for (const item of items) {
    merged.set(item.assetId, (merged.get(item.assetId) ?? 0) + item.quantity);
  }
  const lines = [...merged.entries()].map(([assetId, quantity]) => ({ assetId, quantity }));

  const assets = await prisma.asset.findMany({
    where: { id: { in: lines.map((l) => l.assetId) } },
  });
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  for (const line of lines) {
    const asset = assetMap.get(line.assetId);
    if (!asset) throw badRequest(`Asset ${line.assetId} does not exist`);
    if (asset.status !== "active") {
      throw badRequest(`Asset "${asset.name}" is retired and cannot be booked`);
    }
    if (line.quantity > asset.quantityAvailable) {
      throw conflict(
        `Only ${asset.quantityAvailable} unit(s) of "${asset.name}" are currently available`
      );
    }
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      status: "pending",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      items: { create: lines },
    },
    include: bookingInclude,
  });

  await recordAudit({
    actorId: userId,
    action: "booking.create",
    entity: `booking:${booking.id}`,
    metadata: { items: lines },
  });

  return booking;
}

export async function listMyBookings(userId, { status } = {}) {
  return prisma.booking.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: bookingInclude,
  });
}

export async function listAllBookings({ status } = {}) {
  return prisma.booking.findMany({
    where: { ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: bookingInclude,
  });
}

/**
 * Bookings that an admin can act on for a given asset — those that are
 * approved (ready to issue) or issued (ready to return). Powers the QR scan
 * workflow so a scanned asset surfaces its actionable bookings directly.
 */
export async function listActionableForAsset(assetId) {
  return prisma.booking.findMany({
    where: {
      status: { in: ["approved", "issued"] },
      items: { some: { assetId } },
    },
    orderBy: { createdAt: "asc" },
    include: bookingInclude,
  });
}

export async function getBookingForUser(id, requester) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw notFound("Booking not found");
  if (requester.role !== "admin" && booking.userId !== requester.id) {
    throw forbidden("You can only view your own bookings");
  }
  return booking;
}

/** Cancel a pending booking owned by the requester. No inventory was reserved. */
export async function cancelBooking(id, requester) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound("Booking not found");
  if (booking.userId !== requester.id) {
    throw forbidden("You can only cancel your own bookings");
  }
  if (booking.status !== "pending") {
    throw badRequest(`Only pending bookings can be cancelled (current: ${booking.status})`);
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "cancelled" },
    include: bookingInclude,
  });
  await recordAudit({
    actorId: requester.id,
    action: "booking.cancel",
    entity: `booking:${id}`,
  });
  return updated;
}

/**
 * Approve a booking. This is the concurrency-critical path.
 *
 * Strategy:
 *  - Run inside a single serializable-safe transaction.
 *  - Lock each affected asset row with SELECT ... FOR UPDATE so concurrent
 *    approvals serialize instead of both reading a stale availability count.
 *  - Re-read availability under the lock, decrement, and rely on the DB
 *    CHECK (quantity_available >= 0) as a final backstop.
 */
export async function approveBooking(id, adminId) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: { items: { include: { asset: true } } },
    });
    if (!booking) throw notFound("Booking not found");
    if (booking.status !== "pending") {
      throw conflict(`Only pending bookings can be approved (current: ${booking.status})`);
    }

    // Lock asset rows in a deterministic order to avoid deadlocks.
    const assetIds = [...new Set(booking.items.map((i) => i.assetId))].sort();
    for (const assetId of assetIds) {
      await tx.$queryRaw`SELECT id FROM assets WHERE id = ${assetId} FOR UPDATE`;
    }

    // Aggregate requested quantity per asset, then verify + decrement under lock.
    const needed = new Map();
    for (const item of booking.items) {
      needed.set(item.assetId, (needed.get(item.assetId) ?? 0) + item.quantity);
    }

    for (const [assetId, qty] of needed) {
      const asset = await tx.asset.findUnique({ where: { id: assetId } });
      if (!asset || asset.status !== "active") {
        throw conflict(`Asset is no longer available for booking`);
      }
      if (asset.quantityAvailable < qty) {
        throw conflict(
          `Insufficient stock for "${asset.name}": ${asset.quantityAvailable} available, ${qty} requested`
        );
      }
      await tx.asset.update({
        where: { id: assetId },
        data: { quantityAvailable: { decrement: qty } },
      });
    }

    const updated = await tx.booking.update({
      where: { id },
      data: { status: "approved", reviewedBy: adminId },
      include: bookingInclude,
    });

    await recordAudit({
      actorId: adminId,
      action: "booking.approve",
      entity: `booking:${id}`,
      client: tx,
    });
    await notify({
      userId: booking.userId,
      type: "approval",
      message: "Your booking request has been approved.",
      client: tx,
    });

    return updated;
  });

  return result;
}

/** Reject a pending booking. Nothing was reserved, so no inventory change. */
export async function rejectBooking(id, adminId, reason) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound("Booking not found");
  if (booking.status !== "pending") {
    throw conflict(`Only pending bookings can be rejected (current: ${booking.status})`);
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "rejected", reviewedBy: adminId },
    include: bookingInclude,
  });

  await recordAudit({
    actorId: adminId,
    action: "booking.reject",
    entity: `booking:${id}`,
    metadata: reason ? { reason } : undefined,
  });
  await notify({
    userId: booking.userId,
    type: "rejection",
    message: reason
      ? `Your booking request was rejected: ${reason}`
      : "Your booking request was rejected.",
  });

  return updated;
}

/**
 * Issue an approved booking (mark picked up) and set the due date.
 * Inventory was already decremented at approval, so no count change here.
 */
export async function issueBooking(id, adminId, { dueDate }) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound("Booking not found");
  if (booking.status !== "approved") {
    throw conflict(`Only approved bookings can be issued (current: ${booking.status})`);
  }
  if (new Date(dueDate) < new Date(booking.startDate)) {
    throw badRequest("Due date cannot be before the booking start date");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.issueReturn.upsert({
      where: { bookingId: id },
      create: { bookingId: id, issuedAt: new Date(), dueDate: new Date(dueDate) },
      update: { issuedAt: new Date(), dueDate: new Date(dueDate) },
    });
    return tx.booking.update({
      where: { id },
      data: { status: "issued" },
      include: bookingInclude,
    });
  });

  await recordAudit({
    actorId: adminId,
    action: "booking.issue",
    entity: `booking:${id}`,
    metadata: { dueDate },
  });

  return updated;
}

/**
 * Return an issued booking. Restores inventory under a row lock and records
 * the actual return time and optional condition note.
 */
export async function returnBooking(id, adminId, { conditionNote } = {}) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!booking) throw notFound("Booking not found");
    if (booking.status !== "issued") {
      throw conflict(`Only issued bookings can be returned (current: ${booking.status})`);
    }

    const assetIds = [...new Set(booking.items.map((i) => i.assetId))].sort();
    for (const assetId of assetIds) {
      await tx.$queryRaw`SELECT id FROM assets WHERE id = ${assetId} FOR UPDATE`;
    }

    const restore = new Map();
    for (const item of booking.items) {
      restore.set(item.assetId, (restore.get(item.assetId) ?? 0) + item.quantity);
    }
    for (const [assetId, qty] of restore) {
      await tx.asset.update({
        where: { id: assetId },
        data: { quantityAvailable: { increment: qty } },
      });
    }

    await tx.issueReturn.update({
      where: { bookingId: id },
      data: { returnedAt: new Date(), conditionNote: conditionNote ?? null },
    });

    const updated = await tx.booking.update({
      where: { id },
      data: { status: "returned" },
      include: bookingInclude,
    });

    await recordAudit({
      actorId: adminId,
      action: "booking.return",
      entity: `booking:${id}`,
      metadata: conditionNote ? { conditionNote } : undefined,
      client: tx,
    });

    return updated;
  });

  return result;
}
