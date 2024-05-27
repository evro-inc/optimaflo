import { z } from 'zod';

const cldrRegionCodePattern = /^[A-Z]{2}$/;

// Schema for container create form data
// Define the schema for a single form
const accountSchema = z.object({
  displayName: z.string().min(1, 'Display Name is required'),
  regionCode: z
    .string()
    .min(1, 'Region Code is required')
    .regex(cldrRegionCodePattern, 'Invalid region code. Must be a valid CLDR region code.'),
});

const SingleFormSchema = z.object({
  account: accountSchema,
  redirectUri: z.string(),
  propertyName: z.string(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

// Define the schema for the entire update form with field array

export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Type for the entire update form data
export type FormsSchemaType = z.infer<typeof FormsSchema>;
