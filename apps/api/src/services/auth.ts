import bcrypt from "bcryptjs";
import prisma from "../prisma";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { ConflictError } from "../utils/errors";
import { RegisterInput } from "../validators/auth";

const BCRYPT_ROUNDS = 12;

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

  return { user, accessToken, refreshToken };
}
