import prisma from "../prisma";
import { ForbiddenError, NotFoundError, ConflictError } from "../utils/errors";
import { CreateCategoryInput, UpdateCategoryInput } from "../validators/categories";

export async function list(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true, color: true, icon: true, type: true },
    orderBy: { name: "asc" },
  });
}

export async function create(userId: string, input: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      userId,
      name: input.name,
      color: input.color ?? "#6366f1",
      icon: input.icon ?? "tag",
      type: input.type ?? null,
    },
    select: { id: true, name: true, color: true, icon: true, type: true },
  });
}

export async function update(userId: string, id: string, input: UpdateCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) throw new NotFoundError("Category not found");
  if (category.userId !== userId) throw new ForbiddenError();

  return prisma.category.update({
    where: { id },
    data: input,
    select: { id: true, name: true, color: true, icon: true, type: true },
  });
}

export async function remove(userId: string, id: string) {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) throw new NotFoundError("Category not found");
  if (category.userId !== userId) throw new ForbiddenError();

  const transactionCount = await prisma.transaction.count({
    where: { categoryId: id },
  });

  if (transactionCount > 0) {
    throw new ConflictError(
      `Cannot delete category with ${transactionCount} linked transaction${transactionCount === 1 ? "" : "s"}. Reassign them first.`
    );
  }

  await prisma.category.delete({ where: { id } });
}
