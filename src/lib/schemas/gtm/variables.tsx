import { z } from 'zod';

// Enum for parameter types
const ParameterType = z.enum([
  'boolean',
  'integer',
  'list',
  'map',
  'tagReference',
  'template',
  'triggerReference',
  'typeUnspecified',
]);

const ParameterSchema = z.object({
  type: ParameterType,
  key: z.string(),
  value: z.string(),
  list: z.array(z.lazy(() => ParameterSchema)),
  map: z.array(z.lazy(() => ParameterSchema)),
  isWeakReference: z.boolean(),
});

const FormatValueSchema = z.object({
  caseConversionType: z.enum(['lowercase', 'none', 'uppercase']).optional(),
  convertFalseToValue: ParameterSchema.optional(),
  convertNullToValue: ParameterSchema.optional(),
  convertTrueToValue: ParameterSchema.optional(),
  convertUndefinedToValue: ParameterSchema.optional(),
});

const VariableSchema = z.object({
  path: z.string(),
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

// Export the type inferred from VariableSchema for type safety
export type VariableType = z.infer<typeof VariableSchema>;
