import { z } from 'zod';

// Enum for parameter types
const ParameterType = z.enum([
  'boolean',
  'integer',
  'list',
  'map',
  'tagReference',
  'template',
  'triggerReference',
  'typeUnspecified',
]);

const TagPrioritySchema = z.object({
  type: ParameterType.optional(),
  key: z.string().optional(),
  value: z.string().optional(),
  list: z.array(z.lazy(() => ParameterSchema)).optional(),
  map: z.array(z.lazy(() => ParameterSchema)).optional(),
  isWeakReference: z.boolean().optional(),
});

const ParameterSchema = z.object({
  type: ParameterType,
  key: z.string().optional(),
  value: z.string().optional(),
  list: z.array(z.lazy(() => ParameterSchema)).optional(),
  map: z.array(z.lazy(() => ParameterSchema)).optional(),
  isWeakReference: z.boolean().optional(),
});

const SetupTagSchema = z.object({
  tagName: z.string(),
  stopOnSetupFailure: z.boolean(),
});

const TeardownTagSchema = z.object({
  tagName: z.string(),
  stopTeardownOnFailure: z.boolean(),
});

const ConsentTypeSchema = z.object({
  type: ParameterType,
  key: z.string().optional(),
  value: z.string().optional(),
  list: z.array(z.lazy(() => ParameterSchema)).optional(),
  map: z.array(z.lazy(() => ParameterSchema)).optional(),
  isWeakReference: z.boolean().optional(),
});

const ConsentSettingsSchema = z.object({
  consentStatus: z.enum(['needed', 'notNeeded', 'notSet']),
  consentType: ConsentTypeSchema.optional(),
});

const MonitoringMetadataSchema = z.object({
  type: ParameterType,
  key: z.string().optional(),
  value: z.string().optional(),
  list: z.array(z.lazy(() => ParameterSchema)).optional(),
  map: z.array(z.lazy(() => ParameterSchema)).optional(),
  isWeakReference: z.boolean().optional(),
});

const EntitySchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  tagId: z.string().min(1, 'Tag ID is required').optional(),
});

export const TagSchema = z.object({
  path: z.string(),
  accountContainerWorkspace: z
    .array(EntitySchema)
    .min(1, 'At least one Account-Container-Workspace entry is required'),
  name: z.string(),
  type: z.string(),
  firingRuleId: z.array(z.string()),
  blockingRuleId: z.array(z.string()),
  liveOnly: z.boolean(),
  priority: TagPrioritySchema.optional(),
  notes: z.string().optional(),
  scheduleStartMs: z.number().optional(),
  scheduleEndMs: z.number().optional(),
  parameter: z.array(ParameterSchema),
  fingerprint: z.string().optional(),
  firingTriggerId: z.array(z.string()),
  blockingTriggerId: z.array(z.string()).optional(),
  setupTag: z.array(SetupTagSchema).optional(),
  teardownTag: z.array(TeardownTagSchema).optional(),
  parentFolderId: z.string().optional(),
  tagFiringOption: z
    .enum(['oncePerEvent', 'oncePerLoad', 'tagFiringOptionUnspecified', 'unlimited'])
    .optional(),
  tagManagerUrl: z.string().optional(),
  paused: z.boolean().optional(),
  monitoringMetadata: MonitoringMetadataSchema.optional(),
  monitoringMetadataTagNameKey: z.string().optional(),
  consentSettings: ConsentSettingsSchema.optional(),
});

const revertBaseSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  type: z.string().min(1, 'Type is required'),
  name: z.string().min(1, 'Name is required'),
});

// Revert schema for Tags
export const revertTagSchema = z.object({
  setId: z.number(),
  changeId: z.number(),
  changeStatus: z.enum(['deleted', 'created', 'updated']),
  tag: revertBaseSchema,
  accountName: z.string().min(1, 'Account Name is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  containerName: z.string().min(1, 'Container Name is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceName: z.string().min(1, 'Workspace Name is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormSchema = z.object({
  forms: z.array(TagSchema),
});

// Export the type inferred from TriggerSchema for type safety
export type TagType = z.infer<typeof FormSchema>;
