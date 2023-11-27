import { z } from 'zod';

// Schema for container create form data
// Define the schema for a single form
const SingleFormSchema = z.object({
  accountId: z
    .string()
    .min(10, 'Account Id must be at least 10 characters long'),
  name: z.string().min(1, 'Account Name is required'),
});

// Define the schema for the entire update form with field array
export const UpdateAccountSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Type for the entire update form data
export type UpdateAccountSchemaType = z.infer<typeof UpdateAccountSchema>;
