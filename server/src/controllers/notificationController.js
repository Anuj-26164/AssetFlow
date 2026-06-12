import * as notificationService from "../services/notificationService.js";
import { runDueReminders } from "../services/reminderService.js";
import { notFound } from "../lib/errors.js";

export async function list(req, res) {
  const notifications = await notificationService.listForUser(req.user.id);
  res.json({ notifications });
}

export async function markRead(req, res) {
  const ok = await notificationService.markRead(req.user.id, req.params.id);
  if (!ok) throw notFound("Notification not found");
  res.json({ success: true });
}

export async function markAllRead(req, res) {
  await notificationService.markAllRead(req.user.id);
  res.json({ success: true });
}

/** Admin: manually trigger the due-soon / overdue notification sweep. */
export async function runReminders(_req, res) {
  const result = await runDueReminders();
  res.json({ success: true, ...result });
}
