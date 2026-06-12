import { Router } from "express";
import * as analyticsController from "../controllers/analyticsController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

// System-wide activity history (Admin).
router.get("/", authenticate, requireRole("admin"), asyncHandler(analyticsController.history));

export default router;
