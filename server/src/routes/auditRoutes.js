import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
    res.json({ logs });
  })
);

export default router;
