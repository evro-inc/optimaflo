import { z } from 'zod';

// Enums as Zod enums
export const CountingMethod = z.enum(['ONCE_PER_EVENT', 'ONCE_PER_SESSION']);

export const KeyEventSchema = z.object({
  account: z.string(),
  property: z.string(),
  eventName: z.string().min(1),
  countingMethod: CountingMethod,
  defaultValue: z
    .object({
      numericValue: z.number().optional().nullable(),
      currencyCode: z
        .string()
        .regex(/^[A-Z]{3}$/, 'Must be a valid ISO 4217 currency code')
        .optional()
        .nullable(),
    })
    .optional(), // This is now wrapped in an object
  includeDefaultValue: z.string(),
  name: z.string().optional(),
});

// Export the type inferred from KeyEventsSchema for type safety
export const FormKeyEvents = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormSchema = z.object({
  forms: z.array(KeyEventSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type KeyEvents = z.infer<typeof FormSchema>;
