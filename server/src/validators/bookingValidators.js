import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const bookingCreateSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
    items: z
      .array(
        z.object({
          assetId: z.string().uuid("Invalid asset id"),
          quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        })
      )
      .min(1, "At least one asset is required"),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const issueSchema = z.object({
  dueDate: dateString,
});

export const returnSchema = z.object({
  conditionNote: z.string().trim().max(2000).optional().nullable(),
});

export const rejectSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const bookingListQuerySchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "issued", "returned", "cancelled"])
    .optional(),
});
