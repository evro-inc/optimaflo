import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager';
import Stripe from 'stripe';

export interface PageMeta {
  title: string;
  description: string;
  cardImage: string;
}

export interface Customer {
  id: string /* primary key */;
  stripeCustomerId: string;
  userId: string;
}

export interface Product {
  id: string /* primary key */;
  active?: boolean;
  name?: string;
  description?: string;
  image?: string;
  metadata?: Stripe.Metadata;
}

export interface ProductWithPrice extends Product {
  Price: Price[];
}

export interface UserDetails {
  id: string /* primary key */;
  first_name: string;
  last_name: string;
  full_name?: string;
  avatar_url?: string;
  billing_address?: Stripe.Address;
  payment_method?: Stripe.PaymentMethod[Stripe.PaymentMethod.Type];
}

export interface Price {
  id: string /* primary key */;
  productId?: string /* foreign key to products.id */;
  active?: boolean;
  description?: string;
  unitAmount?: number;
  currency?: string;
  type?: Stripe.Price.Type;
  interval?: Stripe.Price.Recurring.Interval;
  recurringInterval: string;
  intervalCount?: number;
  trialPeriodDays?: number | null;
  metadata?: Stripe.Metadata;
  products?: Product;
}

export interface PriceWithProduct extends Price { }

export interface Subscription {
  id: string /* primary key */;
  subId: string;
  user_id: string;
  status?: Stripe.Subscription.Status;
  metadata?: Stripe.Metadata;
  price_id?: string /* foreign key to prices.id */;
  productId: string;
  quantity?: number;
  cancel_at_period_end?: boolean;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at?: string;
  cancel_at?: string;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  price?: Price; // Updated this line
  User?: User;
}

export interface User {
  id: string /* primary key */;
  stripeCustomerId: null | string;
  subscriptionId: null | string;
  subscriptionStatus: null | string;
  name: null | string;
  email: null | string;
  emailVerified: null | string;
  image: null | string;
  role: string;
  Customer: Customer[];
  Subscription: Subscription[];
}
export type FormElement = {
  accountId: string;
  usageContext: string;
  containerName: string;
  domainName: string;
  notes: string;
  containerId: string;
};

export type Form = {
  forms: FormElement[];
};
export type ContainerType = {
  accountId: string;
  containerId: string;
  name: string;
  publicId: string;
  accountName: string;
  usageContext: [string, ...string[]];
  domainName?: string;
  notes?: string;
};

export type UpdateAccountResult = {
  success: boolean;
  updatedAccounts?: { accountId: string; name: string }[];
  limitReached?: boolean;
  message?: string;
  error?: string;
  notFoundError?: boolean;
  notFoundIds?: string[];
  accountIds?: string[];
  names?: string[];
};

export type GAUpdateAccountResult = {
  success: boolean;
  updatedAccounts?: { name: string; displayName: string }[];
  limitReached?: boolean;
  message?: string;
  error?: string;
  notFoundError?: boolean;
  notFoundIds?: string[];
  accountIds?: string[];
  names?: string[];
};

export type FormUpdateContainerProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any; // Replace 'any' with the actual type if known
  selectedRows: Map<string, ContainerType>;
  table: any;
};

export type FormUpdateWorkspaceProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any; // Replace 'any' with the actual type if known
  selectedRows: Map<string, ContainerType>;
  workspaces?: any;
  table: any;
};
export type FormUpdateProps = {
  showOptions: boolean;
  onClose: () => void;
  selectedRows: Map<string, GA4PropertyType>;
  workspaces?: any;
  table?: any;
};

export type ResultType = {
  data: tagmanager_v2.Schema$Container[] | undefined;
  meta: {
    total: number;
    pageNumber: number;
    totalPages: number;
    pageSize: number;
  };
  errors: null;
};

export type PostParams = {
  userId: string;
  accountId: string;
  name: string;
  usageContext: string[];
  domainName: string;
  notes: string;
};

export type CreateResult = {
  success: boolean;
  limitReached?: boolean;
  message?: string;
  createdContainers?: any[];
  errors?: string;
};

export type FormCreateAccountProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any;
};

export type FormCreateWorkspaceProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any;
  table: any;
};

export type FormCreateProps = {
  showOptions?: boolean;
  onClose?: () => void;
  table: any;
  accounts?: any;
  properties?: any;
  tierLimits?: any;
  dimensions?: any;
  metrics?: any;
};

export type WorkspaceType = {
  accountId: string;
  containerId: string;
  workspaceId: string;
  name: string;
  containerName: string;
  description: string;
};

export type WorkspaceData = {
  accountId: string;
  containerId: string;
  workspaceId: string;
  workspaceName: string;
};

export interface FeatureResult {
  id: string[];
  name: string[];
  success: boolean;
  notFound?: boolean;
  limitReached?: boolean;
  remaining?: number;
  message?: string;
  errors?: string[];
  response?: any;
}

export interface FeatureResponse {
  success: boolean;
  features?: string[];
  errors?: string[];
  limitReached?: boolean;
  errorCode?: number;
  message?: string;
  results: FeatureResult[];
  notFoundError?: boolean;
  revalidationSuccess?: boolean;
}

export type GA4AccountType = {
  name: string;
  displayName: string;
};
export type GA4PropertyType = {
  name: string;
  parent: string;
  displayName: string;
  timeZone: string;
  currencyCode: string;
  serviceLevel?: string;
  account?: string;
  propertyType: string;
  industryCategory: string;
  retention: string;
  resetOnNewActivity: boolean;
  acknowledgment: boolean;
};

export type GA4StreamType = {
  account: string;
  accountName?: string;
  name: string;
  property: string;
  displayName: string;
  accountId: string;
  parent: string;
  type: 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM';
  parentURL: string;
  webStreamData: {
    defaultUri: string;
  };
  androidAppStreamData: {
    packageName: string;
  };
  iosAppStreamData: {
    bundleId: string;
  };
};

type TierLimit = {
  id: string;
  subscriptionId: string;
  createLimit: number;
  createUsage: number;
  updateLimit: number;
  updateUsage?: number;
  deleteLimit?: number;
  deleteUsage?: number;
  productId: string;
  featureId: string;
  Feature: {
    id: string;
    name: string;
    description: string;
  };
  Subscription: {
    id: string;
    subId: string;
    userId: string;
    status: string;
    metadata: null;
    priceId: string;
    productId: string;
    quantity: number;
    cancelAtPeriodEnd: boolean;
    created: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    endedAt: null;
    cancelAt: null;
    canceledAt: null;
    trialStart: null;
    trialEnd: null;
  };
};

type GA4Account = {
  name: string;
  displayName: string;
  regionCode: string;
};

type Property = {
  name: string;
  parent: string;
  createTime: string;
  updateTime: string;
  displayName: string;
  industryCategory: string;
  timeZone: string;
  currencyCode: string;
  serviceLevel: string;
  account: string;
  propertyType: string;
  dataRetentionSettings: {
    name: string;
    eventDataRetention: string;
    resetUserDataOnNewActivity?: boolean;
  };
};

type Stream = {
  name: string;
  type: string;
  displayName: string;
  createTime: string;
  updateTime: string;
  webStreamData?: {
    measurementId: string;
    defaultUri?: string;
  };
  androidAppStreamData?: {
    firebaseAppId: string;
    packageName: string;
  };
  iosAppStreamData?: {
    firebaseAppId: string;
    bundleId: string;
  };
  typeDisplayName: string;
  parent: string;
  property: string;
  accountId: string;
  accountName: string;
};

// Now, define the FormWizardUpdateProps type using the above types
export type FormWizardUpdateProps = {
  tierLimits: TierLimit[];
  properties: Property[];
  table: Stream[];
  accounts: GA4Account[];
};

// Custom Dimension Types
export enum DimensionScope {
  DIMENSION_SCOPE_UNSPECIFIED = 'DIMENSION_SCOPE_UNSPECIFIED',
  EVENT = 'EVENT',
  USER = 'USER',
  ITEM = 'ITEM',
}

export interface CustomDimensionType {
  name: string;
  account: string;
  property: string;
  parameterName: string;
  displayName: string;
  description?: string;
  scope: DimensionScope;
  disallowAdsPersonalization?: boolean;
}

// Custom Metric Types
export enum MeasurementUnit {
  MEASUREMENT_UNIT_UNSPECIFIED = 'MEASUREMENT_UNIT_UNSPECIFIED',
  STANDARD = 'STANDARD',
  CURRENCY = 'CURRENCY',
  FEET = 'FEET',
  METERS = 'METERS',
  KILOMETERS = 'KILOMETERS',
  MILES = 'MILES',
  MILLISECONDS = 'MILLISECONDS',
  SECONDS = 'SECONDS',
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
}

export enum MetricScope {
  METRIC_SCOPE_UNSPECIFIED = 'METRIC_SCOPE_UNSPECIFIED',
  EVENT = 'EVENT',
}

export enum RestrictedMetricType {
  RESTRICTED_METRIC_TYPE_UNSPECIFIED = 'RESTRICTED_METRIC_TYPE_UNSPECIFIED',
  COST_DATA = 'COST_DATA',
  REVENUE_DATA = 'REVENUE_DATA',
}

export interface CustomMetric {
  name: string;
  account: string;
  property: string;
  parameterName: string;
  displayName: string;
  description?: string;
  measurementUnit: MeasurementUnit;
  scope: MetricScope;
  restrictedMetricType?: RestrictedMetricType[];
}

export enum ConversionCountingMethod {
  CONVERSION_COUNTING_METHOD_UNSPECIFIED = 'CONVERSION_COUNTING_METHOD_UNSPECIFIED',
  ONCE_PER_EVENT = 'ONCE_PER_EVENT',
  ONCE_PER_SESSION = 'ONCE_PER_SESSION',
}

interface DefaultConversionValue {
  value: string;
  currencyCode: string;
  type: string;
}

export interface ConversionEvent {
  name: string;
  account: string;
  property: string;
  eventName: string;
  countingMethod?: ConversionCountingMethod;
  defaultConversionValue?: DefaultConversionValue;
}

// Link Types
export interface FirebaseLink {
  account: string;
  property: string;
  name: string;
  project: string;
}

export interface GoogleAdsLink {
  account: string;
  property: string;
  name?: string; // Format: properties/{propertyId}/googleAdsLinks/{googleAdsLinkId}
  customerId: string; // Google Ads customer ID
  adsPersonalizationEnabled: boolean; // Enables personalized advertising features
}

// Account Access Permissions
export enum Role {
  VIEWER = 'predefinedRoles/viewer',
  ANALYST = 'predefinedRoles/analyst',
  EDITOR = 'predefinedRoles/editor',
  ADMIN = 'predefinedRoles/admin',
  NO_COST_DATA = 'predefinedRoles/no-cost-data',
  NO_REVENUE_DATA = 'predefinedRoles/no-revenue-data',
}

export interface AccessBinding {
  account: string;
  name?: string; // Output only. Format: accounts/{account}/accessBindings/{accessBinding} or properties/{property}/accessBindings/{accessBinding}
  roles: Role[]; // A list of roles to grant to the parent resource.
  user: string;
  property: string;
}

/*********************************************************
 Audience Types 
 *********************************************************/

// Main Audience Resource
export interface AudienceType {
  account: string;
  property: string;
  name: string;
  displayName: string;
  description: string;
  membershipDurationDays: number;
  adsPersonalizationEnabled: boolean;
  eventTrigger?: AudienceEventTrigger;
  exclusionDurationMode: AudienceExclusionDurationMode;
  filterClauses: AudienceFilterClause[];
}

// Enums for various Audience fields
enum AudienceExclusionDurationMode {
  UNSPECIFIED = 'AUDIENCE_EXCLUSION_DURATION_MODE_UNSPECIFIED',
  TEMPORARILY = 'EXCLUDE_TEMPORARILY',
  PERMANENTLY = 'EXCLUDE_PERMANENTLY',
}

enum AudienceClauseType {
  UNSPECIFIED = 'AUDIENCE_CLAUSE_TYPE_UNSPECIFIED',
  INCLUDE = 'INCLUDE',
  EXCLUDE = 'EXCLUDE',
}

enum LogCondition {
  UNSPECIFIED = 'LOG_CONDITION_UNSPECIFIED',
  JOINED = 'AUDIENCE_JOINED',
  MEMBERSHIP_RENEWED = 'AUDIENCE_MEMBERSHIP_RENEWED',
}

// Audience Event Trigger
interface AudienceEventTrigger {
  eventName: string;
  logCondition: LogCondition;
}

// Audience Filter Clause
interface AudienceFilterClause {
  clauseType: AudienceClauseType;
  simpleFilter?: AudienceSimpleFilter;
  sequenceFilter?: AudienceSequenceFilter;
}

// Filters
interface AudienceSimpleFilter {
  scope: AudienceFilterScope;
  filterExpression: AudienceFilterExpression;
}

enum AudienceFilterScope {
  UNSPECIFIED = 'AUDIENCE_FILTER_SCOPE_UNSPECIFIED',
  WITHIN_SAME_EVENT = 'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_EVENT',
  WITHIN_SAME_SESSION = 'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_SESSION',
  ACROSS_ALL_SESSIONS = 'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
}

interface AudienceSequenceFilter {
  scope: AudienceFilterScope;
  sequenceMaximumDuration: string; // Duration format, e.g., "3.5s"
  sequenceSteps: AudienceSequenceStep[];
}

interface AudienceSequenceStep {
  scope: AudienceFilterScope;
  immediatelyFollows?: boolean;
  constraintDuration?: string; // Duration format, e.g., "3.5s"
  filterExpression: AudienceFilterExpression;
}

// Audience Filter Expression and supporting types
type AudienceFilterExpression = {
  andGroup?: AudienceFilterExpressionList;
  orGroup?: AudienceFilterExpressionList;
  notExpression?: AudienceFilterExpression;
  dimensionOrMetricFilter?: AudienceDimensionOrMetricFilter;
  eventFilter?: AudienceEventFilter;
};

interface AudienceFilterExpressionList {
  filterExpressions: AudienceFilterExpression[];
}

interface AudienceDimensionOrMetricFilter {
  fieldName: string;
  atAnyPointInTime?: boolean;
  inAnyNDayPeriod?: number;
  // Union of filters, only one of these should be set at a time
  stringFilter?: StringFilter;
  inListFilter?: InListFilter;
  numericFilter?: NumericFilter;
  betweenFilter?: BetweenFilter;
}

// Detailed filter types
interface StringFilter {
  matchType: MatchType;
  value: string;
  caseSensitive?: boolean;
}

enum MatchType {
  UNSPECIFIED = 'MATCH_TYPE_UNSPECIFIED',
  EXACT = 'EXACT',
  BEGINS_WITH = 'BEGINS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  CONTAINS = 'CONTAINS',
  FULL_REGEXP = 'FULL_REGEXP',
}

interface InListFilter {
  values: string[];
  caseSensitive?: boolean;
}

interface NumericFilter {
  operation: Operation;
  value: NumericValue;
}

enum Operation {
  UNSPECIFIED = 'OPERATION_UNSPECIFIED',
  EQUAL = 'EQUAL',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN = 'GREATER_THAN',
}

type NumericValue = {
  int64Value?: string;
  doubleValue?: number;
};

interface BetweenFilter {
  fromValue: NumericValue;
  toValue: NumericValue;
}

interface AudienceEventFilter {
  eventName: string;
  eventParameterFilterExpression?: AudienceFilterExpression;
}

/*********************************************************
 Key Events
 *********************************************************/
export enum CountingMethod {
  UNSPECIFIED = 'COUNTING_METHOD_UNSPECIFIED',
  ONCE_PER_EVENT = 'ONCE_PER_EVENT',
  ONCE_PER_SESSION = 'ONCE_PER_SESSION',
}

// Default Value type
interface DefaultValue {
  numericValue?: number;
  currencyCode?: string;
}

// Key Event type
export interface KeyEventType {
  accountProperty: string[];
  property?: string;
  eventName: string;
  custom?: boolean;
  countingMethod: CountingMethod;
  defaultValue?: DefaultValue;
  deletable?: boolean;
  name?: string;
  includeDefaultValue: boolean;
}

/*********************************************************
 GTM 
 *********************************************************/
export type GTMAccountType = {
  accountId: string;
  name: string;
};

export type Container = {
  accountId: string;
  containerId: string;
  name: string;
  publicId: string;
  usageContext: string[];
};

export type Workspace = {
  accountId: string;
  containerId: string;
  workspaceId: string;
  name: string;
};

export type FormCreateBuiltInVariableProps = {
  showOptions?: boolean;
  onClose?: () => void;
  tierLimits?: any;
  table: any;
  accounts?: any;
  properties?: any;
  containers?: any;
  workspaces?: any;
};

type ParameterType =
  | 'boolean'
  | 'integer'
  | 'list'
  | 'map'
  | 'tagReference'
  | 'template'
  | 'triggerReference'
  | 'typeUnspecified';

// Parameter Interface
interface Parameter {
  type: ParameterType;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

/*********************************************************
 GTM Built-In Variables
 *********************************************************/
// Query parameters
type BuiltInVariableType =
  | 'advertiserId'
  | 'advertisingTrackingEnabled'
  | 'ampBrowserLanguage'
  | 'ampCanonicalHost'
  | 'ampCanonicalPath'
  | 'ampCanonicalUrl'
  | 'ampClientId'
  | 'ampClientMaxScrollX'
  | 'ampClientMaxScrollY'
  | 'ampClientScreenHeight'
  | 'ampClientScreenWidth'
  | 'ampClientScrollX'
  | 'ampClientScrollY'
  | 'ampClientTimestamp'
  | 'ampClientTimezone'
  | 'ampGtmEvent'
  | 'ampPageDownloadTime'
  | 'ampPageLoadTime'
  | 'ampPageViewId'
  | 'ampReferrer'
  | 'ampTitle'
  | 'ampTotalEngagedTime'
  | 'appId'
  | 'appName'
  | 'appVersionCode'
  | 'appVersionName'
  | 'builtInVariableTypeUnspecified'
  | 'clickClasses'
  | 'clickElement'
  | 'clickId'
  | 'clickTarget'
  | 'clickText'
  | 'clickUrl'
  | 'clientName'
  | 'containerId'
  | 'containerVersion'
  | 'debugMode'
  | 'deviceName'
  | 'elementVisibilityFirstTime'
  | 'elementVisibilityRatio'
  | 'elementVisibilityRecentTime'
  | 'elementVisibilityTime'
  | 'environmentName'
  | 'errorLine'
  | 'errorMessage'
  | 'errorUrl'
  | 'event'
  | 'eventName'
  | 'firebaseEventParameterCampaign'
  | 'firebaseEventParameterCampaignAclid'
  | 'firebaseEventParameterCampaignAnid'
  | 'firebaseEventParameterCampaignClickTimestamp'
  | 'firebaseEventParameterCampaignContent'
  | 'firebaseEventParameterCampaignCp1'
  | 'firebaseEventParameterCampaignGclid'
  | 'firebaseEventParameterCampaignSource'
  | 'firebaseEventParameterCampaignTerm'
  | 'firebaseEventParameterCurrency'
  | 'firebaseEventParameterDynamicLinkAcceptTime'
  | 'firebaseEventParameterDynamicLinkLinkid'
  | 'firebaseEventParameterNotificationMessageDeviceTime'
  | 'firebaseEventParameterNotificationMessageId'
  | 'firebaseEventParameterNotificationMessageName'
  | 'firebaseEventParameterNotificationMessageTime'
  | 'firebaseEventParameterNotificationTopic'
  | 'firebaseEventParameterPreviousAppVersion'
  | 'firebaseEventParameterPreviousOsVersion'
  | 'firebaseEventParameterPrice'
  | 'firebaseEventParameterProductId'
  | 'firebaseEventParameterQuantity'
  | 'firebaseEventParameterValue'
  | 'firstPartyServingUrl'
  | 'formClasses'
  | 'formElement'
  | 'formId'
  | 'formTarget'
  | 'formText'
  | 'formUrl'
  | 'historySource'
  | 'htmlId'
  | 'language'
  | 'newHistoryFragment'
  | 'newHistoryState'
  | 'newHistoryUrl'
  | 'oldHistoryFragment'
  | 'oldHistoryState'
  | 'oldHistoryUrl'
  | 'osVersion'
  | 'pageHostname'
  | 'pagePath'
  | 'pageUrl'
  | 'platform'
  | 'queryString'
  | 'randomNumber'
  | 'referrer'
  | 'requestMethod'
  | 'requestPath'
  | 'resolution'
  | 'scrollDepthDirection'
  | 'scrollDepthThreshold'
  | 'scrollDepthUnits'
  | 'sdkVersion'
  | 'serverPageLocationHostname'
  | 'serverPageLocationPath'
  | 'serverPageLocationUrl'
  | 'videoCurrentTime'
  | 'videoDuration'
  | 'videoPercent'
  | 'videoProvider'
  | 'videoStatus'
  | 'videoTitle'
  | 'videoUrl'
  | 'videoVisible'
  | 'visitorRegion';

export interface QueryParameters {
  type: BuiltInVariableType[];
  entity: string[];
}

// Built-In Variable
export interface BuiltInVariable {
  path: string; // GTM BuiltInVariable's API relative path
  accountId: string; // GTM Account ID
  containerId: string; // GTM Container ID
  workspaceId: string; // GTM Workspace ID
  type: BuiltInVariableType; // Type of built-in variable
  name: string; // Name of the built-in variable
}

/*********************************************************
 GTM Container Version Interface
 *********************************************************/

export interface GTMContainerVersion {
  path: string;
  accountId: string;
  containerId: string;
  containerVersionId: string;
  name: string;
  deleted: boolean;
  description: string;
  container: Container;
  tag: Tag[];
  trigger: Trigger[];
  variable: Variable[];
  folder: Folder[];
  builtInVariable: BuiltInVariable[];
  fingerprint: string;
  tagManagerUrl: string;
  zone: Zone[];
  customTemplate: CustomTemplate[];
  client: Client[];
  gtagConfig: GtagConfig[];
  transformation: Transformation[];
}

/*********************************************************
 GTM Tags
 *********************************************************/

// Priority Interface
interface Priority {
  type: string;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

// Setup Tag Interface
interface SetupTag {
  tagName: string;
  stopOnSetupFailure: boolean;
}

// Teardown Tag Interface
interface TeardownTag {
  tagName: string;
  stopTeardownOnFailure: boolean;
}

// Monitoring Metadata Interface
interface MonitoringMetadata {
  type: string;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

// Consent Settings Interface
interface ConsentSettings {
  consentStatus: 'needed' | 'notNeeded' | 'notSet';
  consentType: {
    type: ParameterType;
    key: string;
    value: string;
    list?: Parameter[];
    map?: Parameter[];
    isWeakReference?: boolean;
  };
}

interface Tag {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  tagId: string;
  name: string;
  type: string;
  firingRuleId: string[];
  blockingRuleId: string[];
  liveOnly: boolean;
  priority: Priority;
  notes: string;
  scheduleStartMs: number;
  scheduleEndMs: number;
  parameter: Parameter[];
  fingerprint: string;
  firingTriggerId: string[];
  blockingTriggerId: string[];
  setupTag: SetupTag[];
  teardownTag: TeardownTag[];
  parentFolderId: string;
  tagFiringOption: 'oncePerEvent' | 'oncePerLoad' | 'tagFiringOptionUnspecified' | 'unlimited';
  tagManagerUrl: string;
  paused: boolean;
  monitoringMetadata: MonitoringMetadata;
  monitoringMetadataTagNameKey: string;
  consentSettings: ConsentSettings;
}

/*********************************************************
 GTM Triggers
 *********************************************************/

interface Filter {
  type: string;
  parameter: Parameter[];
}

interface WaitForTags {
  type: string;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

interface CheckValidation {
  type: string;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

interface TimeParameter {
  type: string;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

interface UniqueTriggerId {
  type: string;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

interface Selector {
  type: string;
  key: string;
  value: string;
  list?: Parameter[];
  map?: Parameter[];
  isWeakReference?: boolean;
}

export interface Trigger {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  triggerId: string;
  name: string;
  type: string;
  customEventFilter?: Filter[];
  filter?: Filter[];
  autoEventFilter?: Filter[];
  waitForTags?: WaitForTags;
  checkValidation?: CheckValidation;
  waitForTagsTimeout?: TimeParameter;
  uniqueTriggerId?: UniqueTriggerId;
  eventName?: Parameter;
  interval?: TimeParameter;
  limit?: TimeParameter;
  fingerprint?: string;
  parentFolderId?: string;
  selector?: Selector;
  intervalSeconds?: TimeParameter;
  maxTimerLengthSeconds?: TimeParameter;
  verticalScrollPercentageList?: Parameter;
  horizontalScrollPercentageList?: Parameter;
  visibilitySelector?: Selector;
  visiblePercentageMin?: Parameter;
  visiblePercentageMax?: Parameter;
  continuousTimeMinMilliseconds?: TimeParameter;
  totalTimeMinMilliseconds?: TimeParameter;
  tagManagerUrl?: string;
  notes?: string;
  parameter?: Parameter[];
}

/*********************************************************
 GTM Variables
 *********************************************************/
interface FormatValue {
  caseConversionType: 'lowercase' | 'none' | 'uppercase';
  convertNullToValue?: Parameter;
  convertUndefinedToValue?: Parameter;
  convertTrueToValue?: Parameter;
  convertFalseToValue?: Parameter;
}

export interface Variable {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  variableId: string;
  name: string;
  type: string;
  notes?: string;
  scheduleStartMs?: number;
  scheduleEndMs?: number;
  parameter?: Parameter[];
  enablingTriggerId?: string[];
  disablingTriggerId?: string[];
  fingerprint?: string;
  parentFolderId?: string;
  tagManagerUrl?: string;
  formatValue?: FormatValue;
}

/*********************************************************
 GTM Folders
 *********************************************************/

interface Folder {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  folderId: string;
  name: string;
  fingerprint?: string;
  tagManagerUrl?: string;
  notes?: string;
}

/*********************************************************
 GTM Zones
 *********************************************************/

// Condition interface
interface Condition {
  type: string;
  parameter: Parameter[];
}

// Boundary interface
interface Boundary {
  condition: Condition[];
  customEvaluationTriggerId: string[];
}

// ChildContainer interface
interface ChildContainer {
  publicId: string;
  nickname: string;
}

// TypeRestriction interface
interface TypeRestriction {
  enable: boolean;
  whitelistedTypeId: string[];
}

// GTMZone interface
export interface Zone {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  zoneId: string;
  name: string;
  fingerprint?: string;
  tagManagerUrl?: string;
  notes?: string;
  childContainer: ChildContainer[];
  boundary: Boundary;
  typeRestriction: TypeRestriction;
}

/*********************************************************
 GTM Custom Templates
 *********************************************************/

// Gallery Reference interface
interface GalleryReference {
  host: string;
  owner: string;
  repository: string;
  version: string;
  isModified: boolean;
  signature: string;
}

// GTM Custom Template interface
export interface CustomTemplate {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  templateId: string;
  name: string;
  fingerprint?: string;
  tagManagerUrl?: string;
  templateData: string;
  galleryReference?: GalleryReference;
}

/*********************************************************
 GTM Clients
 *********************************************************/

// GTMClient interface
export interface Client {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  clientId: string;
  name: string;
  type: string;
  parameter: Parameter[];
  priority: number;
  fingerprint?: string;
  tagManagerUrl?: string;
  parentFolderId?: string;
  notes?: string;
}

/*********************************************************
 GTM Google Tag Configuration
 *********************************************************/

// GTM Google Tag Configuration interface
export interface GtagConfig {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  gtagConfigId: string;
  type: string;
  parameter: Parameter[];
  fingerprint?: string;
  tagManagerUrl?: string;
}

/*********************************************************
 GTM Transformations
 *********************************************************/

export interface Transformation {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  transformationId: string;
  name: string;
  type: string;
  parameter: Parameter[];
  fingerprint?: string;
  tagManagerUrl?: string;
  parentFolderId?: string;
  notes?: string;
}


/*********************************************************
 GTM Envs
 *********************************************************/

// Enum for environment types
export enum EnvironmentType {
  Latest = 'latest',
  Live = 'live',
  User = 'user',
  Workspace = 'workspace',
}

// Type for authorizationTimestamp
export interface AuthorizationTimestamp {
  seconds: number;
  nanos: number;
}

// Type for the Google Tag Manager Environment
export interface GoogleTagEnvironment {
  path: string;
  accountId: string;
  containerId: string;
  environmentId: string;
  type: EnvironmentType;
  fingerprint: string;
  name: string;
  description: string;
  enableDebug: boolean;
  url: string;
  authorizationCode: string;
  authorizationTimestamp: AuthorizationTimestamp;
  containerVersionId: string;
  workspaceId: string;
  tagManagerUrl: string;
}
