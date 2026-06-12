import { Router } from "express";
import * as assetController from "../controllers/assetController.js";
import * as assetHealthController from "../controllers/assetHealthController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  assetCreateSchema,
  assetListQuerySchema,
  assetUpdateSchema,
  healthLogCreateSchema,
  idParamSchema,
} from "../validators/assetValidators.js";

const router = Router();

router.get(
  "/",
  authenticate,
  validate({ query: assetListQuerySchema }),
  asyncHandler(assetController.list)
);

router.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(assetController.getOne)
);

// --- QR scan resolution (bonus): asset + its actionable bookings (Admin) ---
router.get(
  "/:id/scan",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema }),
  asyncHandler(assetController.scan)
);

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate({ body: assetCreateSchema }),
  asyncHandler(assetController.create)
);

router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema, body: assetUpdateSchema }),
  asyncHandler(assetController.update)
);

router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema }),
  asyncHandler(assetController.remove)
);

// --- Asset Health Tracking (bonus) ---
router.get(
  "/:id/health",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(assetHealthController.list)
);

router.post(
  "/:id/health",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema, body: healthLogCreateSchema }),
  asyncHandler(assetHealthController.create)
);

export default router;
