import { z } from 'zod';

const SingleFormSchema = z.object({
  type: z.enum([
    'WEB_DATA_STREAM',
    'ANDROID_APP_DATA_STREAM',
    'IOS_APP_DATA_STREAM',
  ]),
  property: z.string(),
  parentURL: z.string(),
  account: z.string(),
  displayName: z.string(),
  webStreamData: z.object({
    defaultUri: z.string().url(),
  }),
  androidAppStreamData: z.object({
    packageName: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+[0-9a-zA-Z_]$/),
  }),
  iosAppStreamData: z.object({
    bundleId: z.string().regex(/^([a-zA-Z0-9]+\.)*[a-zA-Z0-9]+$/),
  }),
});

export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from FormsSchema for type safety in your form handling
export type DataStreamType = z.infer<typeof FormsSchema>;
