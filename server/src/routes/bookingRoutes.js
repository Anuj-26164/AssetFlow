import { Router } from "express";
import * as bookingController from "../controllers/bookingController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { idParamSchema } from "../validators/assetValidators.js";
import {
  bookingCreateSchema,
  bookingListQuerySchema,
  issueSchema,
  rejectSchema,
  returnSchema,
} from "../validators/bookingValidators.js";

const router = Router();

// --- User + Admin ---
router.post(
  "/",
  authenticate,
  validate({ body: bookingCreateSchema }),
  asyncHandler(bookingController.create)
);

router.get(
  "/me",
  authenticate,
  validate({ query: bookingListQuerySchema }),
  asyncHandler(bookingController.listMine)
);

// --- Admin: list everything (must precede "/:id") ---
router.get(
  "/",
  authenticate,
  requireRole("admin"),
  validate({ query: bookingListQuerySchema }),
  asyncHandler(bookingController.listAll)
);

router.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(bookingController.getOne)
);

router.patch(
  "/:id/cancel",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(bookingController.cancel)
);

// --- Admin: approval & issue/return ---
router.patch(
  "/:id/approve",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema }),
  asyncHandler(bookingController.approve)
);

router.patch(
  "/:id/reject",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema, body: rejectSchema }),
  asyncHandler(bookingController.reject)
);

router.patch(
  "/:id/issue",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema, body: issueSchema }),
  asyncHandler(bookingController.issue)
);

router.patch(
  "/:id/return",
  authenticate,
  requireRole("admin"),
  validate({ params: idParamSchema, body: returnSchema }),
  asyncHandler(bookingController.returnAsset)
);

export default router;
