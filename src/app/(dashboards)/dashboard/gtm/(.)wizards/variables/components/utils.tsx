import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';

/* Fetch Data */
export async function fetchGtmData() {
  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();
  const varData = await listVariables();

  return { accountData, containerData, workspaceData, varData };
}

/* Process Data */
export function processGtmData(accountData, containerData, workspaceData, varData) {
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

/* Process Entity Data */
export function processEntityData(accountData, containerData, workspaceData) {
  const flatAccounts = accountData.flat();
  const flatContainers = containerData.flat();
  const flatWorkspaces = workspaceData.flat();

  const combinedData = flatWorkspaces.map((v) => {
    const accountId = v.accountId;
    const containerId = v.containerId;
    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';

    return {
      ...v,
      accountName,
      containerName,
    };
  });

  return combinedData;
}
