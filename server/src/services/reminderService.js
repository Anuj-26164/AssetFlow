import { prisma } from "../lib/prisma.js";
import { notify } from "./notificationService.js";

/**
 * Due-date reminders (bonus). Sweeps issued-but-not-returned bookings and
 * raises in-app notifications:
 *  - `due_soon`  — due today or within the next DUE_SOON_DAYS days.
 *  - `overdue`   — due date is in the past.
 *
 * De-duplicates by embedding the booking id in the message and checking for an
 * existing notification of the same type/booking, so repeated sweeps never
 * spam the same user. Best-effort and non-throwing, like the rest of the
 * notification path.
 */
const DUE_SOON_DAYS = 2;

/** Date-only key (YYYY-MM-DD); ISO strings compare correctly lexicographically. */
function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(value, days) {
  const d = new Date(value);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function alreadyNotified(userId, type, bookingId) {
  const existing = await prisma.notification.findFirst({
    where: { userId, type, message: { contains: bookingId } },
  });
  return Boolean(existing);
}

export async function runDueReminders(now = new Date()) {
  const todayKey = dayKey(now);
  const soonKey = dayKey(addDays(now, DUE_SOON_DAYS));

  const active = await prisma.booking.findMany({
    where: { status: "issued", issueReturn: { is: { returnedAt: null } } },
    include: {
      issueReturn: true,
      items: { include: { asset: true } },
    },
  });

  let created = 0;

  for (const booking of active) {
    if (!booking.issueReturn?.dueDate) continue;
    const dueKey = dayKey(booking.issueReturn.dueDate);
    const assetNames = booking.items.map((i) => i.asset.name).join(", ");

    if (dueKey < todayKey) {
      if (await alreadyNotified(booking.userId, "overdue", booking.id)) continue;
      await notify({
        userId: booking.userId,
        type: "overdue",
        message: `Overdue: "${assetNames}" was due ${dueKey}. Please return it. (booking ${booking.id})`,
      });
      created += 1;
    } else if (dueKey <= soonKey) {
      if (await alreadyNotified(booking.userId, "due_soon", booking.id)) continue;
      await notify({
        userId: booking.userId,
        type: "due_soon",
        message: `Reminder: "${assetNames}" is due back on ${dueKey}. (booking ${booking.id})`,
      });
      created += 1;
    }
  }

  return { created };
}

/**
 * Start a periodic sweep. Runs once shortly after boot, then on `intervalMs`
 * (default hourly). Returns a stop function for graceful shutdown.
 */
export function startReminderScheduler({ intervalMs = 60 * 60 * 1000 } = {}) {
  const tick = async () => {
    try {
      await runDueReminders();
    } catch {
      // Best-effort; a failed sweep must never crash the server.
    }
  };

  const kickoff = setTimeout(tick, 10 * 1000);
  const interval = setInterval(tick, intervalMs);
  if (typeof interval.unref === "function") interval.unref();
  if (typeof kickoff.unref === "function") kickoff.unref();

  return () => {
    clearTimeout(kickoff);
    clearInterval(interval);
  };
}
