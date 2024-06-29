import { AccountPermission, ContainerPermission } from '@/src/types/types';
import { z } from 'zod';

const AccountPermissionType = z.nativeEnum(AccountPermission);
const ContainerPermissionType = z.nativeEnum(ContainerPermission);

const AccountAccessSchema = z.object({
  permission: AccountPermissionType,
});

const ContainerAccessSchema = z.object({
  containerId: z.string(),
  permission: ContainerPermissionType,
});

export const UserPermissionSchema = z.object({
  accountId: z.string(),
  accountAccess: AccountAccessSchema,
  containerAccess: z.array(ContainerAccessSchema),
  emailAddress: z.string().email({ message: 'Invalid email address' })
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
  emailAddresses: z.array(EmailAddressSchema),
  permissions: z.array(UserPermissionSchema),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number().min(1, { message: 'Amount must be at least 1' }),
});

export const FormSchema = z.object({
  forms: z.array(FormSetSchema),
});

export type UserPermissionType = z.infer<typeof UserPermissionSchema>;
export type EmailAddressType = z.infer<typeof EmailAddressSchema>;
export type FormSetType = z.infer<typeof FormSetSchema>;
export type FormValuesType = z.infer<typeof FormSchema>;
export type FormCreateAmountType = z.infer<typeof FormCreateAmountSchema>;
