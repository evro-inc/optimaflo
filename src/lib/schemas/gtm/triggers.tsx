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

const ParameterSchema = z.object({
  type: ParameterType,
  key: z.string().optional(),
  value: z.string().optional(),
  list: z.array(z.lazy(() => ParameterSchema)).optional(),
  map: z.array(z.lazy(() => ParameterSchema)).optional(),
  isWeakReference: z.boolean().optional(),
});

const ConditionSchema = z.object({
  type: z.enum([
    'conditionTypeUnspecified',
    'contains',
    'cssSelector',
    'endsWith',
    'equals',
    'greater',
    'greaterOrEquals',
    'less',
    'lessOrEquals',
    'matchRegex',
    'startsWith',
    'urlMatches',
  ]),
  parameter: z.array(ParameterSchema),
});

const EntitySchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  containerId: z.string().min(1, 'Container ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  triggerId: z.string().min(1, 'Trigger ID is required').optional(),
});

export const TriggerSchema = z.object({
  accountContainerWorkspace: z
    .array(EntitySchema)
    .min(1, 'At least one Account-Container-Workspace entry is required'),
  name: z.string(),
  type: z.enum([
    'always',
    'ampClick',
    'ampScroll',
    'ampTimer',
    'ampVisibility',
    'click',
    'consentInit',
    'customEvent',
    'domReady',
    'elementVisibility',
    'eventTypeUnspecified',
    'firebaseAppException',
    'firebaseAppUpdate',
    'firebaseCampaign',
    'firebaseFirstOpen',
    'firebaseInAppPurchase',
    'firebaseNotificationDismiss',
    'firebaseNotificationForeground',
    'firebaseNotificationOpen',
    'firebaseNotificationReceive',
    'firebaseOsUpdate',
    'firebaseSessionStart',
    'firebaseUserEngagement',
    'formSubmission',
    'historyChange',
    'init',
    'jsError',
    'linkClick',
    'pageview',
    'scrollDepth',
    'serverPageview',
    'timer',
    'triggerGroup',
    'windowLoaded',
    'youTubeVideo',
  ]),
  customEventFilter: z.array(ConditionSchema).optional(),
  filter: z.array(ConditionSchema).optional(),
  autoEventFilter: z.array(ConditionSchema).optional(),
  waitForTags: ParameterSchema.optional(),
  checkValidation: ParameterSchema.optional(),
  waitForTagsTimeout: ParameterSchema.optional(),
  uniqueTriggerId: ParameterSchema.optional(),
  eventName: ParameterSchema.optional(),
  interval: ParameterSchema.optional(),
  limit: ParameterSchema.optional(),
  parentFolderId: z.string().optional(),
  selector: ParameterSchema.optional(),
  intervalSeconds: ParameterSchema.optional(),
  maxTimerLengthSeconds: ParameterSchema.optional(),
  verticalScrollPercentageList: ParameterSchema.optional(),
  horizontalScrollPercentageList: ParameterSchema.optional(),
  visibilitySelector: ParameterSchema.optional(),
  visiblePercentageMin: ParameterSchema.optional(),
  visiblePercentageMax: ParameterSchema.optional(),
  continuousTimeMinMilliseconds: ParameterSchema.optional(),
  totalTimeMinMilliseconds: ParameterSchema.optional(),
  tagManagerUrl: z.string().optional(),
  notes: z.string().optional(),
  parameter: z.array(ParameterSchema).optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormSchema = z.object({
  forms: z.array(TriggerSchema),
});

// Export the type inferred from TriggerSchema for type safety
export type TriggerType = z.infer<typeof FormSchema>;
