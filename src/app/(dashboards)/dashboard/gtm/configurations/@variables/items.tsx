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
  { type: 'URL', name: 'Full Referrer' },
  { type: 'PROTOCOL', name: 'Protocol' },
  { type: 'HOST', name: 'Host Name' },
  { type: 'PORT', name: 'Port' },
  { type: 'PATH', name: 'Path' },
  { type: 'QUERY', name: 'Query' },
  { type: 'FRAGMENT', name: 'Fragment' },
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
  { type: 'ELEMENT', name: 'Element' },
  { type: 'TAG_NAME', name: 'Element Type' },
  { type: 'ATTRIBUTE', name: 'Element Attribute' },
  { type: 'CLASSES', name: 'Element Classes' },
  { type: 'ID', name: 'Element ID' },
  { type: 'TARGET', name: 'Element Target' },
  { type: 'TEXT', name: 'Element Text' },
  { type: 'URL', name: 'Element URL' },
  { type: 'HISTORY_NEW_URL_FRAGMENT', name: 'History New URL Fragment' },
  { type: 'HISTORY_OLD_URL_FRAGMENT', name: 'History Old URL Fragment' },
  { type: 'HISTORY_NEW_STATE', name: 'History New State' },
  { type: 'HISTORY_OLD_STATE', name: 'History Old State' },
  { type: 'HISTORY_CHANGE_SOURCE', name: 'History Change Source' },
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
      listGtmBuiltInVariables(),
      listVariables(),
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
