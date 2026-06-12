import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(60),
});

export const assetCreateSchema = z.object({
  name: z.string().trim().min(2, "Asset name must be at least 2 characters").max(120),
  categoryId: z.string().uuid("A valid category is required"),
  description: z.string().trim().max(2000).optional().nullable(),
  quantityTotal: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  status: z.enum(["active", "retired"]).optional(),
});

export const assetUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  quantityTotal: z.coerce.number().int().min(0).optional(),
  status: z.enum(["active", "retired"]).optional(),
});

export const assetListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  // "available" filters to assets with at least one free unit and active status
  availability: z.enum(["available", "all"]).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export const healthLogCreateSchema = z.object({
  condition: z.enum(["good", "needs_repair", "damaged"], {
    errorMap: () => ({ message: "Condition must be good, needs_repair, or damaged" }),
  }),
  note: z.string().trim().max(2000).optional().nullable(),
});
