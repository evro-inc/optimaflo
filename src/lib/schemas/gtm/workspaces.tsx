import { z } from 'zod';

// Schema for container create form data
// Define the schema for a single form
export const WorkspaceSchema = z.object({
  accountId: z.string().min(10, 'Account Id must be at least 10 characters long'),
  containerId: z.string().min(8, 'Container Id is required'),
  name: z.string().min(1),
  description: z.string().min(1, 'Workspace Description is required').optional(),
  workspaceId: z.string().optional(),
});

// Define the schema for the entire form with field array
export const FormSchema = z.object({
  forms: z.array(WorkspaceSchema),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

// Type for the entire form data
export type WorkspaceSchemaType = z.infer<typeof FormSchema>;
