import { z } from 'zod';

// Enums as Zod enums
export const CountingMethod = z.enum([
  'COUNTING_METHOD_UNSPECIFIED',
  'ONCE_PER_EVENT',
  'ONCE_PER_SESSION',
]);

const KeyEventSchema = z.object({
  accountProperty: z.array(z.string()),
  eventName: z.string().min(1),
  custom: z.boolean().optional(),
  countingMethod: CountingMethod,
  defaultValue: z.object({
    numericValue: z.number(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/, 'Must be a valid ISO 4217 currency code'),
  }).optional(),
  name: z.string().optional(),
  includeDefaultValue: z.boolean(),
});

// Export the type inferred from KeyEventsSchema for type safety
export const FormKeyEvents = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(KeyEventSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type KeyEvents = z.infer<typeof FormsSchema>;
