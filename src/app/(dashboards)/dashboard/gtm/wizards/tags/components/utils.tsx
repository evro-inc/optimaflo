import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listTags } from '@/src/lib/fetch/dashboard/actions/gtm/tags';
import { listTriggers } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';
import { listVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';

/* Fetch Data */
export async function fetchGtmData() {
  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();
  const varData = await listVariables();
  const triggerData = await listTriggers();
  const tagData = await listTags();

  return { accountData, containerData, workspaceData, varData, triggerData, tagData };
}

/* Process Data */
export function processGtmVarData(accountData, containerData, workspaceData, varData) {
  const flatAccounts = accountData.flat();
  const flatContainers = containerData.flat();
  const flatWorkspaces = workspaceData.flat();
  const flatVars = varData.flat();

  const combinedData = flatVars.map((vars) => {
    const accountId = vars.accountId;
    const containerId = vars.containerId;
    const workspaceId = vars.workspaceId;
    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const workspaces = flatWorkspaces.find((p) => p.workspaceId === workspaceId);
    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';
    const workspaceName = workspaces ? workspaces.name : 'Workspace Name Unknown';

    return {
      ...vars,
      accountName,
      containerName,
      workspaceName,
    };
  });

  return combinedData;
}

export function processGtmTriggerData(accountData, containerData, workspaceData, triggerData) {
  const flatAccounts = accountData.flat();
  const flatContainers = containerData.flat();
  const flatWorkspaces = workspaceData.flat();
  const flatTriggers = triggerData.flat();

  const combinedData = flatTriggers.map((t) => {
    const accountId = t.accountId;
    const containerId = t.containerId;
    const workspaceId = t.workspaceId;
    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const workspaces = flatWorkspaces.find((p) => p.workspaceId === workspaceId);
    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';
    const workspaceName = workspaces ? workspaces.name : 'Workspace Name Unknown';

    return {
      ...t,
      accountName,
      containerName,
      workspaceName,
    };
  });

  return combinedData;
}

export function processGtmTagData(accountData, containerData, workspaceData, tagData) {
  const flatAccounts = accountData.flat();
  const flatContainers = containerData.flat();
  const flatWorkspaces = workspaceData.flat();
  const flatTags = tagData.flat();

  const combinedData = flatTags.map((t) => {
    const accountId = t.accountId;
    const containerId = t.containerId;
    const workspaceId = t.workspaceId;
    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const workspaces = flatWorkspaces.find((p) => p.workspaceId === workspaceId);
    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';
    const workspaceName = workspaces ? workspaces.name : 'Workspace Name Unknown';

    return {
      ...t,
      accountName,
      containerName,
      workspaceName,
    };
  });

  return combinedData;
}

/* Process Entity Data */
export function processEntityData(accountData, containerData, workspaceData) {
  const flatAccounts = accountData.flat();
  const flatContainers = containerData.flat();
  const flatWorkspaces = workspaceData.flat();

  const combinedData = flatWorkspaces.map((ws) => {
    const accountId = ws.accountId;
    const containerId = ws.containerId;
    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';

    return {
      ...ws,
      accountName,
      containerName,
    };
  });

  return combinedData;
}
