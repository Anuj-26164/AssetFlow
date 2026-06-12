import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/token.js";
import { conflict, unauthorized } from "../lib/errors.js";

/** Strip sensitive fields before returning a user to the client. */
function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict("An account with that email already exists");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role ?? "user" },
  });

  const token = signToken({ id: user.id, role: user.role });
  return { token, user: toPublicUser(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw unauthorized("Invalid email or password");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw unauthorized("Invalid email or password");
  }

  const token = signToken({ id: user.id, role: user.role });
  return { token, user: toPublicUser(user) };
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw unauthorized("Account no longer exists");
  }
  return toPublicUser(user);
}
