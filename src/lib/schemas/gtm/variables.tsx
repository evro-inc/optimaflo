import { z } from 'zod';

// Enum for parameter types
const ParameterType = z
  .enum([
    'boolean',
    'integer',
    'list',
    'map',
    'tagReference',
    'template',
    'triggerReference',
    'typeUnspecified',
  ])
  .optional();

const ParameterSchema = z.object({
  type: ParameterType,
  key: z.string().optional(),
  value: z.string().optional(),
  list: z.array(z.lazy(() => ParameterSchema)).optional(),
  map: z.array(z.lazy(() => ParameterSchema)).optional(),
  isWeakReference: z.boolean().optional(),
});

const FormatValueSchema = z.object({
  caseConversionType: z.enum(['lowercase', 'none', 'uppercase']).optional(),
  convertFalseToValue: ParameterSchema.optional(),
  convertNullToValue: ParameterSchema.optional(),
  convertTrueToValue: ParameterSchema.optional(),
  convertUndefinedToValue: ParameterSchema.optional(),
});

const EntitySchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  variableId: z.string().min(1, 'Variable ID is required').optional(),
});

export const VariableSchema = z.object({
  accountContainerWorkspace: z
    .array(EntitySchema)
    .min(1, 'At least one Account-Container-Workspace entry is required'),
  name: z.string(),
  type: z.string(),
  notes: z.string().optional(),
  scheduleStartMs: z.number().optional(),
  scheduleEndMs: z.number().optional(),
  parameter: z.array(ParameterSchema),
  enablingTriggerId: z.array(z.string()).optional(),
  disablingTriggerId: z.array(z.string()).optional(),
  fingerprint: z.string().optional(),
  parentFolderId: z.string().optional(),
  tagManagerUrl: z.string().optional(),
  formatValue: FormatValueSchema.optional(),
  path: z.string().optional(),
});

// Base schema for the revert common properties related to the variable
const revertVariableBaseSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  variableId: z.string().min(1, 'Variable ID is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  parameter: z.array(ParameterSchema).optional(),
  fingerprint: z.string().optional(),
  tagManagerUrl: z.string().optional(),
  formatValue: FormatValueSchema.optional(),
});

// Revert schema for Variables
export const revertVariableSchema = z.object({
  setId: z.number(),
  changeId: z.number(),
  changeStatus: z.enum(['deleted', 'created', 'updated']),
  variable: revertVariableBaseSchema, // Includes all variable details
  accountName: z.string().min(1, 'Account Name is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  containerName: z.string().min(1, 'Container Name is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceName: z.string().min(1, 'Workspace Name is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormSchema = z.object({
  forms: z.array(VariableSchema),
});

// Export the type inferred from VariableSchema for type safety
export type VariableSchemaType = z.infer<typeof FormSchema>;
