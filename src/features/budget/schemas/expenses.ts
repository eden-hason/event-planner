import { z } from 'zod';

export const ExpenseAppSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
  emoji: z.string().default('💸'),
  vendorName: z.string().nullable().optional(),
  vendorPhone: z.string().nullable().optional(),
  estimate: z.number().min(0),
  fullyPaid: z.boolean().default(false),
  fullyPaidAt: z.string().nullable(),
  hasAdvance: z.boolean().default(false),
  advanceAmount: z.number().min(0).default(0),
  advancePaid: z.boolean().default(false),
  advancePaidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ExpenseApp = z.infer<typeof ExpenseAppSchema>;

export const ExpenseDbSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string(),
  emoji: z.string(),
  vendor_name: z.string().nullable(),
  vendor_phone: z.string().nullable().optional(),
  estimate: z.union([z.number(), z.string()]).transform(Number),
  fully_paid: z.boolean(),
  fully_paid_at: z.string().nullable(),
  has_advance: z.boolean(),
  advance_amount: z.union([z.number(), z.string()]).transform(Number),
  advance_paid: z.boolean(),
  advance_paid_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ExpenseDbToAppTransformerSchema = ExpenseDbSchema.transform((db) => ({
  id: db.id,
  eventId: db.event_id,
  name: db.name,
  emoji: db.emoji,
  vendorName: db.vendor_name,
  vendorPhone: db.vendor_phone ?? null,
  estimate: db.estimate,
  fullyPaid: db.fully_paid,
  fullyPaidAt: db.fully_paid_at,
  hasAdvance: db.has_advance,
  advanceAmount: db.advance_amount,
  advancePaid: db.advance_paid,
  advancePaidAt: db.advance_paid_at,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

export const ExpenseUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  emoji: z.string().default('💸'),
  vendorName: z.string().nullable().optional(),
  vendorPhone: z.string().nullable().optional(),
  estimate: z.number().min(0, 'Price must be a positive number'),
  fullyPaid: z.boolean().default(false),
  hasAdvance: z.boolean().default(false),
  advanceAmount: z.number().min(0).default(0),
  advancePaid: z.boolean().default(false),
});

export type ExpenseUpsert = z.infer<typeof ExpenseUpsertSchema>;

export const ExpenseAppToDbTransformerSchema = ExpenseUpsertSchema.transform((app) => {
  const db: Record<string, unknown> = {
    name: app.name,
    emoji: app.emoji,
    vendor_name: app.vendorName ?? null,
    vendor_phone: app.vendorPhone ?? null,
    estimate: app.estimate,
    fully_paid: app.fullyPaid,
    has_advance: app.hasAdvance,
    advance_amount: app.advanceAmount,
    advance_paid: app.advancePaid,
  };
  if (app.id !== undefined) db.id = app.id;
  return db;
});
