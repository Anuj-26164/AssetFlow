import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Sign a JWT containing the user's id and role.
 */
export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/**
 * Verify and decode a JWT. Throws if invalid/expired.
 */
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
