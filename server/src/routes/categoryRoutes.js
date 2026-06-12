import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { categoryCreateSchema } from "../validators/assetValidators.js";

const router = Router();

router.get("/", authenticate, asyncHandler(categoryController.list));
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate({ body: categoryCreateSchema }),
  asyncHandler(categoryController.create)
);

export default router;
