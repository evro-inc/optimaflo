import { z } from 'zod';

// Schema for container create form data
// Define the schema for a single form
const SingleFormSchema = z.object({
  accountId: z
    .string()
    .min(10, 'Account Id must be at least 10 characters long'),
  containerId: z.string().min(8, 'Container Id is required'),
  name: z.string().min(1, 'Workspace Name is required'),
  description: z
    .string()
    .min(1, 'Workspace Description is required')
    .optional(),
});

// Define the schema for the entire form with field array
export const CreateWorkspaceSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Type for the entire form data
export type CreateWorkspaceSchemaType = z.infer<typeof CreateWorkspaceSchema>;

// Schema for container update form data
// Define the schema for a single update form
const SingleUpdateFormSchema = SingleFormSchema.extend({
  workspaceId: z.string().min(1, 'Workspace Id is required'),
});

// Define the schema for the entire update form with field array
export const UpdateWorkspaceSchema = z.object({
  forms: z.array(SingleUpdateFormSchema),
});

// Type for the entire update form data
export type UpdateWorkspaceSchemaType = z.infer<typeof UpdateWorkspaceSchema>;