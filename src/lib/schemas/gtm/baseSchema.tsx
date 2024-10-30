import { z } from 'zod';

// Common base schema for shared properties
export const BaseEntitySchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  accountName: z.string().optional(),
  containerName: z.string().optional(),
  workspaceName: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  setId: z.number(),
  changeId: z.number(),
  changeStatus: z.enum(['deleted', 'created', 'updated']),
});

export const AccountContainerWorkspaceSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
});
