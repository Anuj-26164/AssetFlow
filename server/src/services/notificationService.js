import { prisma } from "../lib/prisma.js";

/**
 * Create an in-app notification (bonus). Additive and non-throwing so it can
 * never break a core booking transaction.
 */
export async function notify({ userId, type, message, client }) {
  const db = client ?? prisma;
  try {
    await db.notification.create({ data: { userId, type, message } });
  } catch {
    // Notifications are best-effort.
  }
}

export async function listForUser(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markRead(userId, id) {
  // updateMany scoped by userId prevents reading another user's notifications.
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
  return result.count > 0;
}

export async function markAllRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
