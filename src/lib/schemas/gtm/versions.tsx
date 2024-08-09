import { z } from 'zod';

const CreateVersionSchema = z.object({
  entityId: z.array(z.string()).optional(),
  name: z.string().min(1, 'Version Name is required'),
  notes: z.string().min(1, 'Version Description is required'),
});

// Enum for built-in variable types
export const BuiltInVariableType = z.enum([
  'advertiserId',
  'advertisingTrackingEnabled',
  'ampBrowserLanguage',
  'ampCanonicalHost',
  'ampCanonicalPath',
  'ampCanonicalUrl',
  'ampClientId',
  'ampClientMaxScrollX',
  'ampClientMaxScrollY',
  'ampClientScreenHeight',
  'ampClientScreenWidth',
  'ampClientScrollX',
  'ampClientScrollY',
  'ampClientTimestamp',
  'ampClientTimezone',
  'ampGtmEvent',
  'ampPageDownloadTime',
  'ampPageLoadTime',
  'ampPageViewId',
  'ampReferrer',
  'ampTitle',
  'ampTotalEngagedTime',
  'appId',
  'appName',
  'appVersionCode',
  'appVersionName',
  'builtInVariableTypeUnspecified',
  'clickClasses',
  'clickElement',
  'clickId',
  'clickTarget',
  'clickText',
  'clickUrl',
  'clientName',
  'containerId',
  'containerVersion',
  'debugMode',
  'deviceName',
  'elementVisibilityFirstTime',
  'elementVisibilityRatio',
  'elementVisibilityRecentTime',
  'elementVisibilityTime',
  'environmentName',
  'errorLine',
  'errorMessage',
  'errorUrl',
  'event',
  'eventName',
  'firebaseEventParameterCampaign',
  'firebaseEventParameterCampaignAclid',
  'firebaseEventParameterCampaignAnid',
  'firebaseEventParameterCampaignClickTimestamp',
  'firebaseEventParameterCampaignContent',
  'firebaseEventParameterCampaignCp1',
  'firebaseEventParameterCampaignGclid',
  'firebaseEventParameterCampaignSource',
  'firebaseEventParameterCampaignTerm',
  'firebaseEventParameterCurrency',
  'firebaseEventParameterDynamicLinkAcceptTime',
  'firebaseEventParameterDynamicLinkLinkid',
  'firebaseEventParameterNotificationMessageDeviceTime',
  'firebaseEventParameterNotificationMessageId',
  'firebaseEventParameterNotificationMessageName',
  'firebaseEventParameterNotificationMessageTime',
  'firebaseEventParameterNotificationTopic',
  'firebaseEventParameterPreviousAppVersion',
  'firebaseEventParameterPreviousOsVersion',
  'firebaseEventParameterPrice',
  'firebaseEventParameterProductId',
  'firebaseEventParameterQuantity',
  'firebaseEventParameterValue',
  'firstPartyServingUrl',
  'formClasses',
  'formElement',
  'formId',
  'formTarget',
  'formText',
  'formUrl',
  'historySource',
  'htmlId',
  'language',
  'newHistoryFragment',
  'newHistoryState',
  'newHistoryUrl',
  'oldHistoryFragment',
  'oldHistoryState',
  'oldHistoryUrl',
  'osVersion',
  'pageHostname',
  'pagePath',
  'pageUrl',
  'platform',
  'queryString',
  'randomNumber',
  'referrer',
  'requestMethod',
  'requestPath',
  'resolution',
  'scrollDepthDirection',
  'scrollDepthThreshold',
  'scrollDepthUnits',
  'sdkVersion',
  'serverPageLocationHostname',
  'serverPageLocationPath',
  'serverPageLocationUrl',
  'videoCurrentTime',
  'videoDuration',
  'videoPercent',
  'videoProvider',
  'videoStatus',
  'videoTitle',
  'videoUrl',
  'videoVisible',
  'visitorRegion',
]);

const BuiltInVariableSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  type: BuiltInVariableType,
  name: z.string(),
});

const ClientSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  clientId: z.string(),
  name: z.string(),
  type: z.string(),
});

const CustomTemplateSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  templateId: z.string(),
  name: z.string(),
  type: z.string(),
});

const GtagConfigSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  gtagConfigId: z.string(), // Ensure this matches your interface
  name: z.string(),
  type: z.string(),
});

const TransformationSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  transformationId: z.string(),
  name: z.string(),
  type: z.string(),
});

const FolderSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  folderId: z.string(),
  name: z.string(),
});

const TagSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  tagId: z.string(),
  name: z.string(),
  type: z.string(),
});

const TriggerSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  triggerId: z.string(),
  name: z.string(),
  type: z.string(),
});

const VariableSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  variableId: z.string(),
  name: z.string(),
  type: z.string(),
});

const ZoneSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  workspaceId: z.string(),
  zoneId: z.string(),
  name: z.string(),
  type: z.string(),
});

const ContainerSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  fingerprint: z.string(),
});

const SingleFormSchema = z.object({
  path: z.string(),
  accountId: z.string(),
  containerId: z.string(),
  containerVersionId: z.string(),
  environmentId: z.string().optional(),
  name: z.string(),
  deleted: z.boolean(),
  description: z.string(),
  container: ContainerSchema,
  tag: z.array(TagSchema),
  trigger: z.array(TriggerSchema),
  variable: z.array(VariableSchema),
  folder: z.array(FolderSchema),
  builtInVariable: z.array(BuiltInVariableSchema),
  fingerprint: z.string(),
  tagManagerUrl: z.string(),
  zone: z.array(ZoneSchema),
  customTemplate: z.array(CustomTemplateSchema),
  client: z.array(ClientSchema),
  gtagConfig: z.array(GtagConfigSchema),
  transformation: z.array(TransformationSchema),
  createVersion: CreateVersionSchema,
});

const updateVersionSchema = z.object({
  accountId: z.string(),
  containerId: z.string(),
  containerVersionId: z.string(),
  name: z.string().min(1, 'Version Name is required'),
  description: z.string().min(1, 'Version Description is required'),
});

export const FormSchema = z.object({
  forms: z.array(SingleFormSchema),
});

export const UpdateVersionFormSchema = z.object({
  updateVersion: z.array(updateVersionSchema),
});

// Export the type inferred from FormSchema for type safety
export type ContainerVersionType = z.infer<typeof FormSchema>;
export type UpdateVersionSchemaType = z.infer<typeof UpdateVersionFormSchema>;
