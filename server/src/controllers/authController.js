import * as authService from "../services/authService.js";
import { recordAudit } from "../services/auditService.js";

export async function register(req, res) {
  const result = await authService.register(req.body);
  await recordAudit({
    actorId: result.user.id,
    action: "auth.register",
    entity: `user:${result.user.id}`,
    metadata: { email: result.user.email, role: result.user.role },
  });
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function me(req, res) {
  const user = await authService.getProfile(req.user.id);
  res.json({ user });
}
