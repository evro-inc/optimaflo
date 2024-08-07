import { AccountPermission, ContainerPermission } from '@/src/types/types';
import { z } from 'zod';

const AccountPermissionType = z.nativeEnum(AccountPermission);
const ContainerPermissionType = z.nativeEnum(ContainerPermission);

const AccountAccessSchema = z.object({
  permission: AccountPermissionType,
});

const ContainerAccessSchema = z.object({
  containerId: z.string().min(1, 'Container ID is required'),
  permission: ContainerPermissionType,
});

export const UserPermissionSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  accountAccess: AccountAccessSchema,
  containerAccess: z
    .array(ContainerAccessSchema)
    .min(1, { message: 'At least one container access is required' }),
  emailAddress: z
    .string()
    .email({ message: 'Invalid email address' })
    .refine((value) => value.endsWith('@gmail.com'), {
      message: 'Email address must be a Gmail address',
    }),
});

export const EmailAddressSchema = z.object({
  emailAddress: z
    .string()
    .email({ message: 'Invalid email address' })
    .refine((value) => value.endsWith('@gmail.com'), {
      message: 'Email address must be a Gmail address',
    }),
});

export const FormSetSchema = z.object({
  emailAddresses: z
    .array(EmailAddressSchema)
    .min(1, { message: 'At least one email address is required' }),
  permissions: z
    .array(UserPermissionSchema)
    .min(1, { message: 'At least one permission is required' }),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number().min(1, { message: 'Amount must be at least 1' }),
});

export const FormSchema = z.object({
  forms: z.array(FormSetSchema).min(1, { message: 'At least one form set is required' }),
});

export const TransformedFormSchema = z.object({
  forms: z
    .array(UserPermissionSchema)
    .min(1, { message: 'At least one transformed form is required' }),
});

export type UserPermissionType = z.infer<typeof UserPermissionSchema>;
export type EmailAddressType = z.infer<typeof EmailAddressSchema>;
export type FormSetType = z.infer<typeof FormSetSchema>;
export type FormValuesType = z.infer<typeof FormSchema>;
export type FormCreateAmountType = z.infer<typeof FormCreateAmountSchema>;
export type TransformedDataSchemaType = z.infer<typeof TransformedFormSchema>;
