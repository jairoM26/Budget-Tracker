import prisma from "../prisma";
import { UpdateProfileInput } from "../validators/users";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  currency: true,
  createdAt: true,
} as const;

export async function getProfile(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: USER_SELECT,
  });
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: USER_SELECT,
  });
}
