import { verifyToken } from "../lib/token.js";
import { unauthorized } from "../lib/errors.js";

/**
 * Auth middleware: verifies the Bearer JWT and attaches { id, role } to req.user.
 * Rejects with 401 when the token is missing or invalid.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(unauthorized("Missing or malformed Authorization header"));
  }

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch {
    return next(unauthorized("Invalid or expired token"));
  }
}
