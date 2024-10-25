import { z } from 'zod';

// Schema for container create form data
// Define the schema for a single form
export const AccountSchema = z.object({
  displayName: z.string().min(1, 'Display Name is required'),
  name: z.string().min(1, 'Name is required'),
});

// Define the schema for the entire update form with field array

export const FormsSchema = z.object({
  forms: z.array(AccountSchema),
});

// Type for the entire update form data
export type FormsSchemaType = z.infer<typeof FormsSchema>;
