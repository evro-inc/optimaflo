import { z } from 'zod';

// Enum for environment types
const EnvironmentType = z.enum(['latest', 'live', 'user', 'workspace']);

// Schema for authorizationTimestamp
const AuthorizationTimestampSchema = z.object({
  seconds: z.number().int(),
  nanos: z.number().int().min(0).max(999999999),
});

// Schema for the Google Tag Manager Environment
const GoogleTagEnvironmentSchema = z.object({
  accountId: z.string(),
  containerId: z.string(),
  environmentId: z.string(),
  containerVersionId: z.string(),
  name: z.string(),
  description: z.string(),
  enableDebug: z.boolean().optional(),
  url: z.string().optional(),
});

export const FormSchema = z.object({
  forms: z.array(GoogleTagEnvironmentSchema),
});

// Export the type inferred from GoogleTagEnvironmentSchema for type safety
export type GoogleTagEnvironmentType = z.infer<typeof FormSchema>;
