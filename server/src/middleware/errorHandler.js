import { AppError } from "../lib/errors.js";
import { env } from "../config/env.js";

/** 404 handler for unmatched routes. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Centralized error handler — translates thrown errors into JSON responses. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma unique-constraint violation
  if (err?.code === "P2002") {
    return res.status(409).json({ error: "A record with that value already exists" });
  }
  // Prisma record-not-found on update/delete
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  if (env.nodeEnv === "development") {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return res.status(500).json({ error: "Internal server error" });
}
