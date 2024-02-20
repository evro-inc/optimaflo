import { z } from 'zod';

const SingleFormSchema = z.object({
  type: z.enum(['WEB_DATA_STREAM', 'ANDROID_APP_DATA_STREAM', 'IOS_APP_DATA_STREAM']),
  property: z.string(),
  parentURL: z.string().optional(),
  account: z.string(),
  displayName: z.string(),
  webStreamData: z.object({
    defaultUri: z.string().url().optional(),
  }).optional(),
  androidAppStreamData: z.object({
    packageName: z.string().optional(),

  }).optional(),
  iosAppStreamData: z.object({
    bundleId: z.string().optional(),

  }).optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from FormsSchema for type safety in your form handling
export type DataStreamType = z.infer<typeof FormsSchema>;
