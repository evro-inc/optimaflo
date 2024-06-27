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
  emailAddress: z
    .string()
    .email({ message: 'Invalid email address' })
    .refine((value) => value.endsWith('@gmail.com'), {
      message: 'Email address must be a Gmail address',
    })
    .optional(),
});

export const FormSchema = z.object({
  emailAddresses: z.array(
    z.object({
      emailAddress: z
        .string()
        .email({ message: 'Invalid email address' })
        .refine((value) => value.endsWith('@gmail.com'), {
          message: 'Email address must be a Gmail address',
        }),
    })
  ),
  permissions: z.array(UserPermissionSchema),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export type UserPermissionType = z.infer<typeof UserPermissionSchema>;
export type FormValuesType = z.infer<typeof FormSchema>;
