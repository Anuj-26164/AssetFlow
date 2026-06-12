import * as assetHealthService from "../services/assetHealthService.js";

export async function list(req, res) {
  const history = await assetHealthService.listForAsset(req.params.id);
  res.json({ history });
}

export async function create(req, res) {
  const entry = await assetHealthService.logHealth(req.params.id, req.body, req.user.id);
  res.status(201).json({ entry });
}
