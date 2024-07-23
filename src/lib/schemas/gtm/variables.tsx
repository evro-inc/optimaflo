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

export const VariableSchema = z.object({
  path: z.string().optional(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  variableId: z.string(),
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
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormsSchema = z.object({
  forms: z.array(VariableSchema),
});

export type VariableSchemaType = z.infer<typeof FormsSchema>;
