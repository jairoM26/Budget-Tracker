import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../prisma";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import { RegisterInput, LoginInput } from "../validators/auth";

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_CATEGORIES = [
  { name: "Salary", color: "#22c55e", icon: "briefcase", type: "INCOME" as const },
  { name: "Freelance", color: "#10b981", icon: "laptop", type: "INCOME" as const },
  { name: "Food & Dining", color: "#f97316", icon: "utensils", type: "EXPENSE" as const },
  { name: "Transportation", color: "#3b82f6", icon: "car", type: "EXPENSE" as const },
  { name: "Housing", color: "#8b5cf6", icon: "home", type: "EXPENSE" as const },
  { name: "Entertainment", color: "#ec4899", icon: "film", type: "EXPENSE" as const },
  { name: "Healthcare", color: "#ef4444", icon: "heart", type: "EXPENSE" as const },
  { name: "Other", color: "#6b7280", icon: "tag", type: null },
];

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      categories: {
        create: DEFAULT_CATEGORIES,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      currency: true,
      createdAt: true,
    },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { user, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const found = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!found) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const passwordMatch = await bcrypt.compare(input.password, found.passwordHash);
  if (!passwordMatch) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const { id, email, name, currency, createdAt } = found;
  const user = { id, email, name, currency, createdAt };

  const accessToken = generateAccessToken(id);
  const refreshToken = generateRefreshToken(id);

  await prisma.refreshToken.create({
    data: {
      userId: id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { user, accessToken, refreshToken };
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) {
    throw new UnauthorizedError("Missing refresh token");
  }

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  // Rotate: delete old token, issue new one
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newRefreshToken = generateRefreshToken(payload.sub);
  await prisma.refreshToken.create({
    data: {
      userId: payload.sub,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  const accessToken = generateAccessToken(payload.sub);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;

  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashToken(refreshToken) },
  });
}
