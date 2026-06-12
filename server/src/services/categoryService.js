import { prisma } from "../lib/prisma.js";

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assets: true } } },
  });
}

export async function createCategory({ name }) {
  return prisma.category.create({ data: { name } });
}
