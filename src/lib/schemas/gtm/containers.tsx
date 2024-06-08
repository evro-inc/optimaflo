import { z } from 'zod';

const UsageContextType = z.enum(['web', 'android', 'ios']);

// Helper function to validate domain name (simplified example)
const isValidDomainName = (domain: string) => {
  const domainRegex = /^(?:[a-zA-Z0-9-]{1,63}\.){1,125}[a-zA-Z]{2,63}$/;
  return domainRegex.test(domain);
};

const FeaturesSchema = z.object({
  supportUserPermissions: z.boolean(),
  supportEnvironments: z.boolean(),
  supportWorkspaces: z.boolean(),
  supportGtagConfigs: z.boolean(),
  supportBuiltInVariables: z.boolean(),
  supportClients: z.boolean(),
  supportFolders: z.boolean(),
  supportTags: z.boolean(),
  supportTemplates: z.boolean(),
  supportTriggers: z.boolean(),
  supportVariables: z.boolean(),
  supportVersions: z.boolean(),
  supportZones: z.boolean(),
  supportTransformations: z.boolean(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

// Schema for container create form data
// Define the schema for a single form
const SingleFormSchema = z.object({
  path: z.string(),
  accountId: z.string().nonempty('Account Id is required'),
  containerId: z.string().optional(),
  publicId: z.string(),
  tagIds: z.array(z.string()).optional(),
  features: FeaturesSchema,
  usageContext: z.array(UsageContextType),
  name: z.string().nonempty('Container Name is required'),
  domainName: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        const domains = value.split(',').map((domain) => domain.trim());
        return domains.every(isValidDomainName);
      },
      {
        message:
          'Invalid domain name list. Format should be comma-separated list of domains with no protocol (e.g. http/https)',
      }
    ),
  notes: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true; // Skip validation if value is null or undefined
        return value.length >= 1 && value.length <= 500;
      },
      {
        message: 'Notes must be between 1 and 500 characters',
      }
    ),
  tagManagerUrl: z.string(),
  taggingServerUrls: z.array(z.string()).optional(),
});

// Define the schema for the entire form with field array
export const FormSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Type for the entire form data
export type ContainerSchemaType = z.infer<typeof FormSchema>;
