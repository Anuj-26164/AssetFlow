import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { idParamSchema } from "../validators/assetValidators.js";

const router = Router();

router.get("/", authenticate, asyncHandler(notificationController.list));
router.patch("/read-all", authenticate, asyncHandler(notificationController.markAllRead));
router.post(
  "/run-reminders",
  authenticate,
  requireRole("admin"),
  asyncHandler(notificationController.runReminders)
);
router.patch(
  "/:id/read",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(notificationController.markRead)
);

export default router;
