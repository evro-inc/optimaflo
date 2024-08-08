import { z } from 'zod';

// Schema for the Google Tag Manager Environment
const GoogleTagEnvironmentSchema = z.object({
  accountId: z.string(),
  containerId: z.string(),
  environmentId: z.string(),
  containerVersionId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enableDebug: z.boolean().optional(),
  url: z.string().optional(),
});

export const FormSchema = z.object({
  forms: z.array(GoogleTagEnvironmentSchema),
});

// Export the type inferred from GoogleTagEnvironmentSchema for type safety
export type GoogleTagEnvironmentType = z.infer<typeof FormSchema>;
