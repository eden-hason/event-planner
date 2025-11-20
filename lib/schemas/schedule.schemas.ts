import z from "zod";

export const ScheduleAppSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  dueTime: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScheduleApp = z.infer<typeof ScheduleAppSchema>;