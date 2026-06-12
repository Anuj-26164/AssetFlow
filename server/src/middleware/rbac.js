import { forbidden, unauthorized } from "../lib/errors.js";

/**
 * RBAC middleware factory. Default-deny: a route is only reachable by the
 * roles explicitly listed. Must run after `authenticate`.
 *
 * Usage: router.post("/", authenticate, requireRole("admin"), handler)
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden("You do not have permission to perform this action"));
    }
    return next();
  };
}
