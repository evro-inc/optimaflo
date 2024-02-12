import { z } from 'zod';


const SingleFormSchema = z.object({
  type: z.enum(["WEB_DATA_STREAM", "ANDROID_APP_DATA_STREAM", "IOS_APP_DATA_STREAM"]),
  property: z.string(), 
  account: z.string(),
  displayName: z.string(),
  webStreamData: z.object({
    measurementId: z.string(),
    firebaseAppId: z.string(),
    defaultUri: z.string(),
  }),
  androidAppStreamData: z.object({
    firebaseAppId: z.string(),
    packageName: z.string(),
  }),
  iosAppStreamData: z.object({
    firebaseAppId: z.string(),
    bundleId: z.string(),
  }),
});

export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});


// Export the type inferred from FormsSchema for type safety in your form handling
export type DataStreamType = z.infer<typeof FormsSchema>;