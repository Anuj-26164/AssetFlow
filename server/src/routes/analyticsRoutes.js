import { Router } from "express";
import * as analyticsController from "../controllers/analyticsController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  requireRole("admin"),
  asyncHandler(analyticsController.summary)
);
router.get(
  "/utilization",
  authenticate,
  requireRole("admin"),
  asyncHandler(analyticsController.utilization)
);
router.get(
  "/trends",
  authenticate,
  requireRole("admin"),
  asyncHandler(analyticsController.trends)
);

export default router;
