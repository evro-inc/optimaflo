import { z } from 'zod';

const WebStreamDataSchema = z.object({
  measurementId: z.string(),
  firebaseAppId: z.string(),
  defaultUri: z.string(),
});

const AndroidAppStreamDataSchema = z.object({
  firebaseAppId: z.string(),
  packageName: z.string(),
});

const IosAppStreamDataSchema = z.object({
  firebaseAppId: z.string(),
  bundleId: z.string(),
});

export const DataStreamSchema = z.object({
  type: z.enum(['WEB_DATA_STREAM', 'ANDROID_APP_DATA_STREAM', 'IOS_APP_DATA_STREAM']),
  displayName: z.string(),
  webStreamData: z.optional(WebStreamDataSchema),
  androidAppStreamData: z.optional(AndroidAppStreamDataSchema),
  iosAppStreamData: z.optional(IosAppStreamDataSchema),
});

export const FormsSchema = z.object({
  forms: z.array(DataStreamSchema),
});


// Export the type inferred from FormsSchema for type safety in your form handling
export type FormsType = z.infer<typeof FormsSchema>;
export type DataStreamType = z.infer<typeof DataStreamSchema>;