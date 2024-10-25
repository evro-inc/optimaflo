import { Option } from '@/components/ui/multi-select';

export const BuiltInVariableGroups = {
  Click: ['clickClasses', 'clickElement', 'clickId', 'clickTarget', 'clickText', 'clickUrl'],
  Error: ['errorLine', 'errorMessage', 'errorUrl', 'debugMode'],
  Form: ['formClasses', 'formElement', 'formId', 'formTarget', 'formText', 'formUrl'],
  History: [
    'historySource',
    'newHistoryFragment',
    'newHistoryState',
    'oldHistoryFragment',
    'oldHistoryState',
  ],
  Page: ['pageHostname', 'pagePath', 'pageUrl', 'referrer'],

  ScrollDepth: ['scrollDepthDirection', 'scrollDepthThreshold', 'scrollDepthUnits'],
  Utilities: [
    'event',
    'environmentName',
    'containerId',
    'containerVersion',
    'randomNumber',
    'htmlId',
  ],
  Video: [
    'videoCurrentTime',
    'videoDuration',
    'videoPercent',
    'videoProvider',
    'videoStatus',
    'videoTitle',
    'videoUrl',
    'videoVisible',
  ],
  Visibility: [
    'elementVisibilityFirstTime',
    'elementVisibilityRatio',
    'elementVisibilityRecentTime',
    'elementVisibilityTime',
  ],
};

// Group Built-In Variables by Categories for better UI rendering
export const groupBuiltInVariables: Option[] = [
  { label: 'Click Classes', value: 'clickClasses', group: 'Click Variables' },
  { label: 'Click Element', value: 'clickElement', group: 'Click Variables' },
  { label: 'Click ID', value: 'clickId', group: 'Click Variables' },
  { label: 'Click Target', value: 'clickTarget', group: 'Click Variables' },
  { label: 'Click URL', value: 'clickUrl', group: 'Click Variables' },

  { label: 'Page URL', value: 'pageUrl', group: 'Page Variables' },
  { label: 'Page Hostname', value: 'pageHostname', group: 'Page Variables' },
  { label: 'Page Path', value: 'pagePath', group: 'Page Variables' },
  { label: 'Referrer', value: 'referrer', group: 'Page Variables' },

  { label: 'Event', value: 'event', group: 'Event Variables' },
  { label: 'Event Name', value: 'eventName', group: 'Event Variables' },

  /* ampVariables: [
    { label: 'AMP Title', value: 'ampTitle' },
    { label: 'AMP Client ID', value: 'ampClientId' },
    { label: 'AMP Browser Language', value: 'ampBrowserLanguage' },
    { label: 'AMP Canonical Host', value: 'ampCanonicalHost' },
    { label: 'AMP Canonical Path', value: 'ampCanonicalPath' },
    { label: 'AMP Canonical URL', value: 'ampCanonicalUrl' },
    { label: 'AMP Client Max Scroll X', value: 'ampClientMaxScrollX' },
    { label: 'AMP Client Max Scroll Y', value: 'ampClientMaxScrollY' },
    { label: 'AMP Client Screen Height', value: 'ampClientScreenHeight' },
    { label: 'AMP Client Screen Width', value: 'ampClientScreenWidth' },
    { label: 'AMP Client Scroll X', value: 'ampClientScrollX' },
    { label: 'AMP Client Scroll Y', value: 'ampClientScrollY' },
    { label: 'AMP Client Timestamp', value: 'ampClientTimestamp' },
    { label: 'AMP Client Timezone', value: 'ampClientTimezone' },
    { label: 'AMP GTM Event', value: 'ampGtmEvent' },
    { label: 'AMP Page Download Time', value: 'ampPageDownloadTime' },
    { label: 'AMP Page Load Time', value: 'ampPageLoadTime' },
    { label: 'AMP Page View ID', value: 'ampPageViewId' },
    { label: 'AMP Referrer', value: 'ampReferrer' },
    { label: 'AMP Total Engaged Time', value: 'ampTotalEngagedTime' },
  ], */

  { label: 'Form Classes', value: 'formClasses', group: 'Form Variables' },
  { label: 'Form Element', value: 'formElement', group: 'Form Variables' },
  { label: 'Form ID', value: 'formId', group: 'Form Variables' },
  { label: 'Form Target', value: 'formTarget', group: 'Form Variables' },
  { label: 'Form Text', value: 'formText', group: 'Form Variables' },
  { label: 'Form URL', value: 'formUrl', group: 'Form Variables' },

  { label: 'Video Current Time', value: 'videoCurrentTime', group: 'Video Variables' },
  { label: 'Video Duration', value: 'videoDuration', group: 'Video Variables' },
  { label: 'Video Percent', value: 'videoPercent', group: 'Video Variables' },
  { label: 'Video Provider', value: 'videoProvider', group: 'Video Variables' },
  { label: 'Video Status', value: 'videoStatus', group: 'Video Variables' },
  { label: 'Video Title', value: 'videoTitle', group: 'Video Variables' },
  { label: 'Video URL', value: 'videoUrl', group: 'Video Variables' },
  { label: 'Video Visible', value: 'videoVisible', group: 'Video Variables' },

  { label: 'Platform', value: 'platform', group: 'PlatForm Variables' },
  { label: 'Language', value: 'language', group: 'PlatForm Variables' },
  { label: 'Resolution', value: 'resolution', group: 'PlatForm Variables' },
  { label: 'OS Version', value: 'osVersion', group: 'PlatForm Variables' },

  { label: 'Old History URL', value: 'oldHistoryUrl', group: 'History Variables' },
  { label: 'New History URL', value: 'newHistoryUrl', group: 'History Variables' },
  { label: 'History Source', value: 'historySource', group: 'History Variables' },

  { label: 'Scroll Depth Direction', value: 'scrollDepthDirection', group: 'Scroll Variables' },
  { label: 'Scroll Depth Threshold', value: 'scrollDepthThreshold', group: 'Scroll Variables' },
  { label: 'Scroll Depth Units', value: 'scrollDepthUnits', group: 'Scroll Variables' },

  { label: 'Error Line', value: 'errorLine', group: 'Error Variables' },
  { label: 'Error Message', value: 'errorMessage', group: 'Error Variables' },
  { label: 'Error URL', value: 'errorUrl', group: 'Error Variables' },
];
