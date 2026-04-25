import { z } from 'zod';

export const GiftAppSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  guestId: z.string().uuid().nullable(),
  guestName: z.string().min(1),
  amount: z.number().min(0),
  isReceived: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type GiftApp = z.infer<typeof GiftAppSchema>;

export const GiftDbSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  guest_id: z.string().uuid().nullable(),
  guest_name: z.string(),
  amount: z.union([z.number(), z.string()]).transform(Number),
  is_received: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const GiftDbToAppTransformerSchema = GiftDbSchema.transform((db) => ({
  id: db.id,
  eventId: db.event_id,
  guestId: db.guest_id,
  guestName: db.guest_name,
  amount: db.amount,
  isReceived: db.is_received,
  notes: db.notes,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
}));

export const GiftUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  guestId: z.string().uuid().nullable().optional(),
  guestName: z.string().min(1, 'Guest name is required').max(255),
  amount: z.number().min(0, 'Amount must be a positive number'),
  isReceived: z.boolean().default(false),
  notes: z.string().nullable().optional(),
});

export type GiftUpsert = z.infer<typeof GiftUpsertSchema>;

export const GiftAppToDbTransformerSchema = GiftUpsertSchema.transform((app) => {
  const db: Record<string, unknown> = {
    guest_id: app.guestId ?? null,
    guest_name: app.guestName,
    amount: app.amount,
    is_received: app.isReceived,
    notes: app.notes ?? null,
  };
  if (app.id !== undefined) db.id = app.id;
  return db;
});
