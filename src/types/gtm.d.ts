export type BuiltInVariableType =
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
  | 'videoVisible';

export type VariableType =
  | 'k'
  | 'aev'
  | 'c'
  | 'jsm'
  | 'v'
  | 'd'
  | 'f'
  | 'j'
  | 'gas'
  | 'smm'
  | 'remm'
  | 'u'
  | 'vis'
  | 'e'
  | 'ev'
  | 'r'
  | 'uv'
  | 'awec'
  | 'cid'
  | 'dbg'
  | 'ctv';

export interface Parameter {
  type?: string;
  key?: string;
  value?: any;
  list?: Parameter[];
  map?: Parameter[];
}

export interface Variable {
  decodeCookie: string;
  name: string;
  type: VariableType;
  parameter: Parameter[];
  notes?: string;
  scheduleStartMs?: string;
  scheduleEndMs?: string;
  fingerprint?: string;
  parentFolderId?: string;
  enablingTriggerId?: string[];
  disablingTriggerId?: string[];
}

export interface FormatValue {
  caseConversionType: string;
  convert_null_to_value: {
    type: string;
    value: string;
  };
  convert_undefined_to_value: {
    type: string;
    value: string;
  };
  convert_true_to_value: {
    type: string;
    value: string;
  };
  convert_false_to_value: {
    type: string;
    value: string;
  };
}

export interface RequestParams {
  userId: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  variable: Variable;
}
