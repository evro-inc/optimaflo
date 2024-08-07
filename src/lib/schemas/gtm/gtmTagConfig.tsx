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

const GoogleTagConfigSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  gtagConfigId: z.string(),
  type: z.string(),
  parameter: z.array(ParameterSchema),
  fingerprint: z.string().optional(),
  tagManagerUrl: z.string().optional(),
});

// Export the type inferred from GoogleTagConfigSchema for type safety
export type GoogleTagConfigType = z.infer<typeof GoogleTagConfigSchema>;
