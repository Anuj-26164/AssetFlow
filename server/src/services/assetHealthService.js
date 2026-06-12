import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";
import { recordAudit } from "./auditService.js";

/**
 * List the maintenance / condition history for an asset, newest first.
 */
export async function listForAsset(assetId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw notFound("Asset not found");

  return prisma.assetHealth.findMany({
    where: { assetId },
    orderBy: { loggedAt: "desc" },
  });
}

/**
 * Record a new condition entry for an asset (Admin). Append-only history —
 * the most recent entry represents the asset's current condition.
 */
export async function logHealth(assetId, { condition, note }, actorId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw notFound("Asset not found");

  const entry = await prisma.assetHealth.create({
    data: { assetId, condition, note: note ?? null },
  });

  await recordAudit({
    actorId,
    action: "asset.health.log",
    entity: `asset:${assetId}`,
    metadata: { condition, note: note ?? undefined },
  });

  return entry;
}
