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
