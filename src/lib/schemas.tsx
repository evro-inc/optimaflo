import { z } from 'zod';

// Helper function to validate domain name (simplified example)
const isValidDomainName = (domain: string) => {
  const domainRegex = /^(?:[a-zA-Z0-9-]{1,63}\.){1,125}[a-zA-Z]{2,63}$/;
  return domainRegex.test(domain);
};

// Schema for container create form data
export const CreateContainerSchema = z.object({
  accountId: z.string().nonempty('accountId is required'),
  usageContext: z.string().nonempty('usageContext is required'),
  containerName: z.string().nonempty('containerName is required'),
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
});

export type CreateContainerSchemaType = z.infer<typeof CreateContainerSchema>;

export const CreateContainerSchemaArr = z.array(CreateContainerSchema);

// Schema for container update form data
export const UpdateContainerSchema = CreateContainerSchema.extend({
  containerId: z.string().nonempty('containerId is required'),
});

export type UpdateContainerSchemaType = z.infer<typeof UpdateContainerSchema>;

export const UpdateContainerSchemaArr = z.array(UpdateContainerSchema);
