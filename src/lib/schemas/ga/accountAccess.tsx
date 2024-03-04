import { z } from 'zod';

const RoleSchema = z.enum([
  'predefinedRoles/viewer',
  'predefinedRoles/analyst',
  'predefinedRoles/editor',
  'predefinedRoles/admin',
  'predefinedRoles/no-cost-data',
  'predefinedRoles/no-revenue-data',
]);

const SingleFormSchema = z.object({
  name: z.string().regex(
    /^(accounts\/\d+\/accessBindings\/\d+|properties\/\d+\/accessBindings\/\d+)$/,
    "Invalid format for 'name'. Expected format: accounts/{account}/accessBindings/{accessBinding} or properties/{property}/accessBindings/{accessBinding}"
  ).optional(),
  roles: z.array(RoleSchema), // Validate roles against the predefined roles
  user: z.string().email().optional(), // Validate the user email, optional
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type AccountPermissionsSchemaType = z.infer<typeof FormsSchema>;
