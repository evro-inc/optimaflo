import { z } from 'zod';

// Schema for container create form data
// Define the schema for a single form
const SingleFormSchema = z.object({
  displayName: z.string().min(1, 'Display Name is required'),
  name: z.string().min(1, 'Name is required'),
});

// Define the schema for the entire update form with field array

export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Type for the entire update form data
export type FormsSchemaType = z.infer<typeof FormsSchema>;

export type CreateContainerSchemaType = z.infer<typeof FormsSchema>;
