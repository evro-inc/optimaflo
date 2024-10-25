import { z } from 'zod';

export const DimensionSchema = z.object({
  name: z.string(),
  account: z.string(),
  property: z.string(),
  parameterName: z.string().max(40), // Considering the longest limit of 40 characters for event-scoped dimensions
  displayName: z
    .string()
    .min(1)
    .max(82)
    .refine((value) => /^[A-Za-z]/.test(value), { message: 'Must start with a letter' }),
  description: z.string().max(150).optional(),
  scope: z.enum(['DIMENSION_SCOPE_UNSPECIFIED', 'EVENT', 'USER', 'ITEM']),
  disallowAdsPersonalization: z.boolean().optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormSchema = z.object({
  forms: z.array(DimensionSchema),
});

// Export the type inferred from FormsSchema for type safety in your form handling
export type CustomDimensionSchemaType = z.infer<typeof FormSchema>;
