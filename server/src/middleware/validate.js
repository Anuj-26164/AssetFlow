import { ZodError } from "zod";
import { badRequest } from "../lib/errors.js";

/**
 * Validation middleware factory using zod schemas.
 * Validates and replaces req.body / req.query / req.params with parsed values.
 */
export function validate({ body, query, params }) {
  return (req, _res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (query) req.validatedQuery = query.parse(req.query);
      if (params) req.params = params.parse(req.params);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest(
            "Validation failed",
            err.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
          )
        );
      }
      return next(err);
    }
  };
}
