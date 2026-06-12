import { prisma } from "../lib/prisma.js";

/**
 * Append-only audit logging (bonus). Additive only — never throws into the
 * caller's flow, so a logging failure can't break a core operation.
 *
 * @param {object} opts
 * @param {string|null} opts.actorId  - user id performing the action
 * @param {string} opts.action        - e.g. "asset.create"
 * @param {string} opts.entity        - affected entity id/name
 * @param {object} [opts.metadata]    - before/after payload
 * @param {object} [opts.client]      - optional transaction client
 */
export async function recordAudit({ actorId, action, entity, metadata, client }) {
  const db = client ?? prisma;
  try {
    await db.auditLog.create({
      data: { actorId: actorId ?? null, action, entity, metadata: metadata ?? undefined },
    });
  } catch {
    // Swallow — auditing must never break the primary transaction.
  }
}
