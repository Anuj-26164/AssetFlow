import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  // Feature routers
  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/assets", assetRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/history", historyRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/audit-logs", auditRoutes);

  // 404 + error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
