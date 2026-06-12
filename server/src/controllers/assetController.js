import * as assetService from "../services/assetService.js";
import * as bookingService from "../services/bookingService.js";
import { recordAudit } from "../services/auditService.js";

export async function list(req, res) {
  const assets = await assetService.listAssets(req.validatedQuery ?? {});
  res.json({ assets });
}

export async function getOne(req, res) {
  const asset = await assetService.getAsset(req.params.id);
  res.json({ asset });
}

/**
 * Resolve a scanned QR code (asset id) to the asset plus the bookings an admin
 * can act on (approved → issue, issued → return). Powers the QR scan workflow.
 */
export async function scan(req, res) {
  const asset = await assetService.getAsset(req.params.id);
  const actionableBookings = await bookingService.listActionableForAsset(asset.id);
  res.json({ asset, actionableBookings });
}

export async function create(req, res) {
  const asset = await assetService.createAsset(req.body);
  await recordAudit({
    actorId: req.user.id,
    action: "asset.create",
    entity: `asset:${asset.id}`,
    metadata: { name: asset.name, quantityTotal: asset.quantityTotal },
  });
  res.status(201).json({ asset });
}

export async function update(req, res) {
  const asset = await assetService.updateAsset(req.params.id, req.body);
  await recordAudit({
    actorId: req.user.id,
    action: "asset.update",
    entity: `asset:${asset.id}`,
    metadata: req.body,
  });
  res.json({ asset });
}

export async function remove(req, res) {
  const result = await assetService.deleteAsset(req.params.id);
  await recordAudit({
    actorId: req.user.id,
    action: "asset.delete",
    entity: `asset:${result.id}`,
  });
  res.json({ success: true, id: result.id });
}
