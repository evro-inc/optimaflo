import { z } from 'zod';

// Enums as Zod enums
export const CountingMethod = z.enum([
  'COUNTING_METHOD_UNSPECIFIED',
  'ONCE_PER_EVENT',
  'ONCE_PER_SESSION',
]);

const DefaultValueSchema = z.object({
  numericValue: z.number(),
  currencyCode: z.string(),
});

const KeyEventSchema = z.object({
  account: z.array(z.string()),

  eventName: z.string(),
  custom: z.boolean().optional(),
  countingMethod: CountingMethod,
  defaultValue: DefaultValueSchema.optional(),
  name: z.string().optional(),
});

// Export the type inferred from KeyEventsSchema for type safety
export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(KeyEventSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type KeyEvents = z.infer<typeof FormsSchema>;
