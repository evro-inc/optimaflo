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
  consentType: ConsentTypeSchema,
});

const MonitoringMetadataSchema = z.object({
  type: ParameterType,
  key: z.string().optional(),
  value: z.string().optional(),
  list: z.array(z.lazy(() => ParameterSchema)).optional(),
  map: z.array(z.lazy(() => ParameterSchema)).optional(),
  isWeakReference: z.boolean().optional(),
});

const TagSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  tagId: z.string(),
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

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormsSchema = z.object({
  forms: z.array(TagSchema),
});

// Export the type inferred from TriggerSchema for type safety
export type TagType = z.infer<typeof FormsSchema>;
