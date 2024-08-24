import { z } from 'zod';

// Schema for container create form data
// Define the schema for a single form
const SingleFormSchema = z.object({
  displayName: z.string().min(1, 'Display Name is required'),
  timeZone: z.string().min(1, 'Timezone is required'),
  currencyCode: z.string().min(1, 'Currency is required'),
  industryCategory: z.string().min(1, 'Industry Category is required'),
  name: z.string().min(1, 'Name is required'),
  parent: z.string().min(1, 'Parent is required'),
  propertyType: z.string().min(1, 'Property Type is required'),
  retention: z.string().min(1, 'Retention is required'),
  resetOnNewActivity: z.boolean().default(false),
  acknowledgment: z.boolean().default(false),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

// Define the schema for the entire update form with field array
export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Type for the entire update form data
export type FormSchemaType = z.infer<typeof FormsSchema>;
