import { z } from 'zod';

const RoleSchema = z.enum([
  'predefinedRoles/viewer',
  'predefinedRoles/analyst',
  'predefinedRoles/editor',
  'predefinedRoles/admin',
  'predefinedRoles/no-cost-data',
  'predefinedRoles/no-revenue-data',
]);

export const AccountAccessSchema = z.object({
  account: z.string(),
  roles: z.array(RoleSchema),
  user: z.string().email(),
  name: z.string().optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(AccountAccessSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type AccountPermissionsSchema = z.infer<typeof FormsSchema>;
