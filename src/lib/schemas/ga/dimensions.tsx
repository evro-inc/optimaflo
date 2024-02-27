import { z } from 'zod';

const SingleFormSchema = z.object({
  name: z.string(),
  property: z.string(),
  parameterName: z.string().max(40), // Considering the longest limit of 40 characters for event-scoped dimensions
  displayName: z.string().min(1).max(82), // Display name must start with a letter, so minimum length is set to 1
  description: z.string().max(150).optional(),
  scope: z.enum(['DIMENSION_SCOPE_UNSPECIFIED', 'EVENT', 'USER', 'ITEM']),
  disallowAdsPersonalization: z.boolean().optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from FormsSchema for type safety in your form handling
export type CustomDimensionSchemaType = z.infer<typeof FormsSchema>;
