import { z } from 'zod';

const ConversionCountingMethodSchema = z.enum([
  'CONVERSION_COUNTING_METHOD_UNSPECIFIED',
  'ONCE_PER_EVENT',
  'ONCE_PER_SESSION',
]);

const DefaultConversionValueSchema = z.object({
  value: z.union([z.string(), z.number()]),
  currencyCode: z.string(),
  type: z.string(),
});

const SingleFormSchema = z.object({
  name: z.string().optional(),
  account: z.string(),
  property: z.string(),
  eventName: z.string().min(1),
  countingMethod: ConversionCountingMethodSchema.optional(),
  defaultConversionValue: DefaultConversionValueSchema.optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type CustomConversionSchemaType = z.infer<typeof FormsSchema>;
