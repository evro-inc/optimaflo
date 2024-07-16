import { listVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import { listGtmBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';

export const variableTypeArray = [
  { type: 'k', name: 'First Party Cookie' },
  { type: 'aev', name: 'Auto-Event Variable' },
  { type: 'c', name: 'Constant' },
  { type: 'jsm', name: 'Custom JS' },
  { type: 'v', name: 'Data Layer Variable' },
  { type: 'd', name: 'DOM Element' },
  { type: 'f', name: 'HTTP Referrer' },
  { type: 'j', name: 'JavaScript Variable' },
  { type: 'smm', name: 'Lookup Table' },
  { type: 'remm', name: 'Regex Lookup Table' },
  { type: 'u', name: 'URL' },
  { type: 'vis', name: 'Element Visibility' },
  { type: 'e', name: 'Custom Event' },
  { type: 'ev', name: 'Environment Name' },
  { type: 'r', name: 'Random Number' },
  { type: 'uv', name: 'Undefined Value' },
  { type: 'awec', name: 'User Provided Data' },
  { type: 'cid', name: 'Container Id' },
  { type: 'dbg', name: 'Debug' },
  { type: 'gtes', name: 'Google Tag: Event Settings' },
  { type: 'gtcs', name: 'Google Tag: Configuration Settings' },
  { type: 'ctv', name: 'Container Version Number' },
];

export const httpReferrerType = [
  { type: 'fullReferrer', name: 'Full Referrer' },
  { type: 'protocol', name: 'Protocol' },
  { type: 'hostName', name: 'Host Name' },
  { type: 'port', name: 'Port' },
  { type: 'path', name: 'Path' },
  { type: 'query', name: 'Query' },
  { type: 'fragment', name: 'Fragment' },
];

export const formatValueOptions = [
  { label: 'Convert Null To Value', name: 'convertNullToValue' },
  { label: 'Convert Undefined To Value', name: 'convertUndefinedToValue' },
  { label: 'Convert True To Value', name: 'convertTrueToValue' },
  { label: 'Convert False To Value', name: 'convertFalseToValue' },
];

export const caseConversionTypes = [
  { value: 'none', label: 'None' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
];

export const aevType = [
  { type: 'element', name: 'Element' },
  { type: 'elementType', name: 'Element Type' },
  { type: 'elementAttribute', name: 'Element Attribute' },
  { type: 'elementClasses', name: 'Element Classes' },
  { type: 'elementId', name: 'Element ID' },
  { type: 'elementTarget', name: 'Element Target' },
  { type: 'elementText', name: 'Element Text' },
  { type: 'elementUrl', name: 'Element URL' },
  { type: 'historyNewUrlFragment', name: 'History New URL Fragment' },
  { type: 'historyOldUrlFragment', name: 'History Old URL Fragment' },
  { type: 'historyNewState', name: 'History New State' },
  { type: 'historyOldState', name: 'History Old State' },
  { type: 'historyChangeSource', name: 'History Change Source' },
];

export const caseConversionType = [
  {
    type: 'lowercase',
    name: 'Lowercase',
  },
  {
    type: 'uppercase',
    name: 'Uppercase',
  },
];

export async function fetchAllVariables() {
  try {
    const [builtIns, userDefs] = await Promise.all([
      listGtmBuiltInVariables(true),
      listVariables(true),
    ]);

    // Clean and structure the data
    const formattedBuiltIns = builtIns.flat().map((variable) => ({
      name: variable.name,
      variableType: 'builtIn',
      type: variable.type,
    }));

    const formattedUserDefs = userDefs.flat().map((variable) => ({
      name: variable.name,
      variableType: 'userDefined',
      type: variable.type,
    }));

    const allVariables = [...formattedBuiltIns, ...formattedUserDefs];

    // Remove duplicates by type
    const uniqueVariables = Array.from(new Set(allVariables.map((variable) => variable.type))).map(
      (type) => {
        return allVariables.find((variable) => variable.type === type);
      }
    );

    return uniqueVariables;
  } catch (error) {
    console.error('Error fetching variables:', error);
    return [];
  }
}

export async function fetchGTMIDs(data) {
  try {
    const formattedData = data.flat().map((d) => ({
      accountName: d.accountName,
      accountId: d.accountId,
      containerName: d.containerName,
      containerId: d.containerId,
      workspaceName: d.workspaceName,
      workspaceId: d.workspaceId,
    }));

    return [...formattedData];
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}
