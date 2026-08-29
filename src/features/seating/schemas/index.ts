import { z } from 'zod';
import { GuestWithGroupAppSchema } from '@/features/guests/schemas';

export const TABLE_SHAPES = ['round', 'rectangle', 'square'] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

// ADR-0009: below two seats is not a table, and above twenty-four the seat
// diagram stops being readable, which is the whole point of drawing it.
export const MIN_CAPACITY = 2;
export const MAX_CAPACITY = 24;
export const DEFAULT_CAPACITY = 10;
export const MAX_TABLE_NUMBER = 999;

// Quarter turns only. A Table's footprint has to stay computable so the canvas
// can place and frame it, and an arbitrary angle is what made the old rotation
// column decorative rather than load-bearing (ADR-0009).
export const TABLE_ROTATIONS = [0, 90, 180, 270] as const;
export type TableRotation = (typeof TABLE_ROTATIONS)[number];

// --- 1. Canonical App-Level Table Schema (camelCase) ---

export const TableAppSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  label: z.string().max(50, 'Table name is too long').nullable(),
  tableNumber: z.number().int().min(1).max(MAX_TABLE_NUMBER),
  shape: z.enum(TABLE_SHAPES, {
    message: 'Shape must be round, rectangle, or square',
  }),
  capacity: z.number().int().min(MIN_CAPACITY).max(MAX_CAPACITY),
  rotation: z.literal(TABLE_ROTATIONS),
  positionX: z.number(),
  positionY: z.number(),
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
  rotation: z.literal(TABLE_ROTATIONS),
  position_x: z.number(),
  position_y: z.number(),
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
    rotation: dbData.rotation,
    positionX: dbData.position_x,
    positionY: dbData.position_y,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  }),
);

// --- 4. Upsert Schema ---

const labelField = z
  .string()
  .max(50, 'Table name is too long')
  .nullable()
  .optional();

const capacityField = z
  .number()
  .int()
  .min(MIN_CAPACITY, `A table seats at least ${MIN_CAPACITY}`)
  .max(MAX_CAPACITY, `A table seats at most ${MAX_CAPACITY}`);

const tableNumberField = z
  .number()
  .int()
  .min(1, 'Table number must be at least 1')
  .max(MAX_TABLE_NUMBER, `Table number must be ${MAX_TABLE_NUMBER} or less`);

export const TableUpsertSchema = z.object({
  id: z.uuid().optional(),
  eventId: z.uuid().optional(),
  label: labelField,
  shape: z.enum(TABLE_SHAPES).optional(),
  capacity: capacityField.optional(),
  rotation: z.literal(TABLE_ROTATIONS).optional(),
  tableNumber: tableNumberField.optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

export type TableUpsert = z.infer<typeof TableUpsertSchema>;

// The single-Table dialog form. Every field is required and validated here so
// the dialog does not re-encode the numeric limits by hand: `capacityField` and
// `tableNumberField` carry the same bounds the Server Action and the database
// enforce. The occupied-capacity floor is dynamic, so the dialog raises the
// minimum with `.superRefine` against a value it passes in rather than baking it
// into the schema.
export const TableFormSchema = z.object({
  tableNumber: tableNumberField,
  label: z.string().max(50, 'Table name is too long'),
  capacity: capacityField,
  shape: z.enum(TABLE_SHAPES),
});

export type TableFormValues = z.infer<typeof TableFormSchema>;

// --- 5. App→DB Transformer ---

export const TableAppToDbTransformerSchema = TableUpsertSchema.transform(
  (appData) => {
    const dbData: Record<string, unknown> = {};

    if (appData.id !== undefined) dbData.id = appData.id;
    if (appData.eventId !== undefined) dbData.event_id = appData.eventId;
    if (appData.label !== undefined) dbData.label = appData.label ?? null;
    if (appData.shape !== undefined) dbData.shape = appData.shape;
    if (appData.capacity !== undefined) dbData.capacity = appData.capacity;
    if (appData.rotation !== undefined) dbData.rotation = appData.rotation;
    if (appData.tableNumber !== undefined) {
      dbData.table_number = appData.tableNumber;
    }
    if (appData.positionX !== undefined) dbData.position_x = appData.positionX;
    if (appData.positionY !== undefined) dbData.position_y = appData.positionY;

    return dbData;
  },
);

export type TableDbUpsert = z.infer<typeof TableAppToDbTransformerSchema>;

// --- 6. Batch creation ---

// Batch creation is all-or-nothing (ADR-0008), so the form validates as one
// unit: quantity and starting number together decide the whole number range,
// and a range running past the maximum is rejected before anything is written.
export const TableBatchCreateSchema = z
  .object({
    quantity: z
      .number()
      .int()
      .min(1, 'Create at least one table')
      .max(100, 'Create at most 100 tables at once'),
    startNumber: tableNumberField,
    capacity: capacityField,
    shape: z.enum(TABLE_SHAPES),
  })
  .refine((v) => v.startNumber + v.quantity - 1 <= MAX_TABLE_NUMBER, {
    message: `Table numbers stop at ${MAX_TABLE_NUMBER}`,
    path: ['quantity'],
  });

export type TableBatchCreate = z.infer<typeof TableBatchCreateSchema>;

// --- 7. Extended Schemas (with relations) ---

export const TableWithGuestsAppSchema = TableAppSchema.extend({
  guests: z.array(GuestWithGroupAppSchema).default([]),
});

export type TableWithGuestsApp = z.infer<typeof TableWithGuestsAppSchema>;
