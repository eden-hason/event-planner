import { z } from 'zod';
import { GuestWithGroupAppSchema } from '@/features/guests/schemas';

export const TABLE_SHAPES = ['round', 'rectangle', 'square'] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

// --- 1. Canonical App-Level Table Schema (camelCase) ---

export const TableAppSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  label: z.string().max(50, 'Table name is too long').nullable(),
  tableNumber: z.number().int().min(1),
  shape: z.enum(TABLE_SHAPES, {
    message: 'Shape must be round, rectangle, or square',
  }),
  capacity: z
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .max(100, 'Capacity must be 100 or less'),
  positionX: z.number(),
  positionY: z.number(),
  rotation: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TableApp = z.infer<typeof TableAppSchema>;

// --- 2. DB-Level Table Schema (snake_case) ---

export const TableDbSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid(),
  label: z.string().nullable(),
  table_number: z.number().int(),
  shape: z.enum(TABLE_SHAPES),
  capacity: z.number().int(),
  position_x: z.number(),
  position_y: z.number(),
  rotation: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TableDb = z.infer<typeof TableDbSchema>;

// --- 3. DB→App Transformer ---

export const TableDbToAppTransformerSchema = TableDbSchema.transform(
  (dbData) => ({
    id: dbData.id,
    eventId: dbData.event_id,
    label: dbData.label,
    tableNumber: dbData.table_number,
    shape: dbData.shape,
    capacity: dbData.capacity,
    positionX: dbData.position_x,
    positionY: dbData.position_y,
    rotation: dbData.rotation,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  }),
);

// --- 4. Upsert Schema ---

export const TableUpsertSchema = z.object({
  id: z.uuid().optional(),
  eventId: z.uuid().optional(),
  label: z
    .string()
    .max(50, 'Table name is too long')
    .nullable()
    .optional(),
  shape: z
    .enum(TABLE_SHAPES, {
      message: 'Shape must be round, rectangle, or square',
    })
    .optional(),
  capacity: z
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .max(100, 'Capacity must be 100 or less')
    .optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  rotation: z.number().optional(),
});

export type TableUpsert = z.infer<typeof TableUpsertSchema>;

// --- 5. App→DB Transformer ---

export const TableAppToDbTransformerSchema = TableUpsertSchema.transform(
  (appData) => {
    const dbData: Record<string, unknown> = {};

    if (appData.id !== undefined) dbData.id = appData.id;
    if (appData.eventId !== undefined) dbData.event_id = appData.eventId;
    if (appData.label !== undefined) dbData.label = appData.label ?? null;
    if (appData.shape !== undefined) dbData.shape = appData.shape;
    if (appData.capacity !== undefined) dbData.capacity = appData.capacity;
    if (appData.positionX !== undefined) dbData.position_x = appData.positionX;
    if (appData.positionY !== undefined) dbData.position_y = appData.positionY;
    if (appData.rotation !== undefined) dbData.rotation = appData.rotation;

    return dbData;
  },
);

export type TableDbUpsert = z.infer<typeof TableAppToDbTransformerSchema>;

// --- 6. Extended Schemas (with relations) ---

export const TableWithGuestsAppSchema = TableAppSchema.extend({
  guests: z.array(GuestWithGroupAppSchema).default([]),
});

export type TableWithGuestsApp = z.infer<typeof TableWithGuestsAppSchema>;
