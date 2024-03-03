import { z } from 'zod';

const SingleFormSchema = z.object({
  account: z.string(),
  property: z.string(),
  name: z.string().regex(/^properties\/\d+\/firebaseLinks\/\d+$/, "Invalid format for 'name'. Expected format: properties/{propertyId}/firebaseLinks/{firebaseLinkId}"),
  project: z.string().regex(/^projects\/\d+$/, "Invalid format for 'project'. Expected format: projects/{projectNumber}"),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type FirebaseLinkSchemaType = z.infer<typeof FormsSchema>;
