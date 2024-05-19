import { z } from 'zod';

// Enums as Zod enums
export const CountingMethod = z.enum([
  'COUNTING_METHOD_UNSPECIFIED',
  'ONCE_PER_EVENT',
  'ONCE_PER_SESSION',
]);

const DefaultValueSchema = z.object({
  numericValue: z.number(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/, 'Must be a valid ISO 4217 currency code'),
});

const KeyEventSchema = z.object({
  name: z.string(),
  eventName: z.string(),
  deletable: z.boolean(),
  custom: z.boolean(),
  countingMethod: CountingMethod,
  defaultValue: DefaultValueSchema.optional(),
});

export const KeyEventsSchema = z.object({
  keyEvents: z.array(KeyEventSchema),
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
