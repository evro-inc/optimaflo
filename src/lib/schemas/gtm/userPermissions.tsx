import { z } from 'zod';

// Enum for account permissions
const AccountPermissionType = z.enum(['accountPermissionUnspecified', 'admin', 'noAccess', 'user']);

// Enum for container permissions
const ContainerPermissionType = z.enum([
  'approve',
  'containerPermissionUnspecified',
  'edit',
  'noAccess',
  'publish',
  'read',
]);

const AccountAccessSchema = z.object({
  permission: AccountPermissionType,
});

const ContainerAccessSchema = z.object({
  containerId: z.string(),
  permission: ContainerPermissionType,
});

const UserPermissionSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  emailAddress: z.string(),
  accountAccess: AccountAccessSchema,
  containerAccess: z.array(ContainerAccessSchema),
});

// Export the type inferred from UserPermissionSchema for type safety
export type UserPermissionType = z.infer<typeof UserPermissionSchema>;
