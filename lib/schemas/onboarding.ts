import { z } from 'zod';

export const FileMetadataSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  originalName: z.string(),
  size: z.number(),
  mimeType: z.string(),
  uploadedAt: z.string(),
});

export const OnboardingSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  eventDate: z.date().optional(),
  eventType: z.string().optional(),
  eventTypes: z.array(z.string()).optional(),
  maxGuests: z.number().min(1).optional(),
  budget: z.number().min(0).optional(),
  file: FileMetadataSchema.optional(),
  pricingPlan: z.string().optional(),
});

export type OnboardingFormData = z.infer<typeof OnboardingSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
