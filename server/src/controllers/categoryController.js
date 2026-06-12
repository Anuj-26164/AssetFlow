import * as categoryService from "../services/categoryService.js";
import { recordAudit } from "../services/auditService.js";

export async function list(_req, res) {
  const categories = await categoryService.listCategories();
  res.json({ categories });
}

export async function create(req, res) {
  const category = await categoryService.createCategory(req.body);
  await recordAudit({
    actorId: req.user.id,
    action: "category.create",
    entity: `category:${category.id}`,
    metadata: { name: category.name },
  });
  res.status(201).json({ category });
}
