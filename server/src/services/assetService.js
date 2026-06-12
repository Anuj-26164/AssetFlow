import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";

export async function listAssets({ search, categoryId, availability } = {}) {
  const where = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (availability === "available") {
    where.status = "active";
    where.quantityAvailable = { gt: 0 };
  }

  return prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      healthLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
    },
  });
}

export async function getAsset(id) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: true,
      healthLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
    },
  });
  if (!asset) throw notFound("Asset not found");
  return asset;
}

export async function createAsset(data) {
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw badRequest("Category does not exist");

  // On creation, all units are available.
  return prisma.asset.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      description: data.description ?? null,
      quantityTotal: data.quantityTotal,
      quantityAvailable: data.quantityTotal,
      status: data.status ?? "active",
    },
    include: { category: true },
  });
}

export async function updateAsset(id, data) {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw notFound("Asset not found");

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw badRequest("Category does not exist");
  }

  const patch = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
  };

  // Adjusting total quantity must keep availability consistent:
  // available shifts by the same delta as total, and can never go below 0
  // or above the new total.
  if (data.quantityTotal !== undefined) {
    const inUse = asset.quantityTotal - asset.quantityAvailable;
    if (data.quantityTotal < inUse) {
      throw badRequest(
        `Cannot set total below units currently in use (${inUse} issued/reserved)`
      );
    }
    patch.quantityTotal = data.quantityTotal;
    patch.quantityAvailable = data.quantityTotal - inUse;
  }

  return prisma.asset.update({
    where: { id },
    data: patch,
    include: { category: true },
  });
}

export async function deleteAsset(id) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { bookingItems: { include: { booking: true } } },
  });
  if (!asset) throw notFound("Asset not found");

  // Block deletion when the asset is tied to live bookings to preserve history.
  const hasActiveBooking = asset.bookingItems.some((item) =>
    ["pending", "approved", "issued"].includes(item.booking.status)
  );
  if (hasActiveBooking) {
    throw badRequest(
      "Cannot delete an asset with pending, approved, or issued bookings. Retire it instead."
    );
  }

  await prisma.asset.delete({ where: { id } });
  return { id };
}
