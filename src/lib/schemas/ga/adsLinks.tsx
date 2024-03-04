import { z } from 'zod';

const SingleFormSchema = z.object({
  account: z.string(),
  property: z.string(),
  customerId: z.string(), // Assuming customer ID follows a specific pattern, apply regex as needed
  adsPersonalizationEnabled: z.boolean().default(true), // Defaulted to true if not set
  name: z.string().optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type GoogleAdsLinkSchemaType = z.infer<typeof FormsSchema>;
