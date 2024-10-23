// GTM-specific field configurations

import { groupBuiltInVariables } from '../app/(dashboards)/dashboard/gtm/configurations/@builtInVariables/items';
import { variableTypeArray } from '../app/(dashboards)/dashboard/gtm/configurations/@variables/items';

// Define the possible field types for the form
type FieldType = 'select' | 'text' | 'switch' | 'multiSelect';
type EntityType =
  | 'GTMAccount'
  | 'GTMContainer'
  | 'GTMWorkspace'
  | 'GTMPermissions'
  | 'GTMBuiltInVariables'
  | 'GTMVariables';
type FormType = 'create' | 'update' | 'switch';

// Define the structure of your field configuration
interface FieldConfig {
  label: string;
  description: string;
  placeholder: string;
  type?: FieldType;
  options?: { label: string; value: string }[];
}

// Define a generic type for data source, allowing flexibility
type DataSourceType = any;

const getCommonAccountFields = (): Record<string, FieldConfig> => ({
  name: {
    label: 'Account Name',
    description: 'This is the account name you want to update.',
    placeholder: 'Name of the account.',
    type: 'text',
  },
});

const getCommonWorkspaceFields = (
  accountsWithContainers: { name: string; accountId: string }[],
  filteredContainers: { name: string; containerId: string }[]
): Record<string, FieldConfig> => ({
  name: {
    label: 'Workspace Name',
    description: 'This is the workspace name you want to create.',
    placeholder: 'Name of the workspace.',
    type: 'text',
  },
  accountId: {
    label: 'Account',
    description: 'This is the account you want to associate with the property.',
    placeholder: 'Select an account.',
    type: 'select',
    options: accountsWithContainers.map((account) => ({
      label: account.name,
      value: account.accountId,
    })),
  },
  containerId: {
    label: 'Container',
    description: 'This is the container you want to associate with the workspace.',
    placeholder: 'Select an container.',
    type: 'select',
    options: filteredContainers.map((con) => ({
      label: con.name,
      value: con.containerId,
    })),
  },
  description: {
    label: 'Description',
    description: 'This is the description you want to add.',
    placeholder: 'Description.',
    type: 'text',
  },
});

const getEmailFields = (): Record<string, FieldConfig> => ({
  emailAddresses: {
    label: 'Email Addresses',
    description: 'Add the email addresses that you want to include in permissions.',
    type: 'text',
    placeholder: '',
  },
});

const getEntityFields = (): Record<string, FieldConfig> => ({
  entitySelection: {
    label: 'Entity Selection',
    description: 'Select the accounts and containers to provide access to.',
    type: 'text',
    placeholder: '',
  },
});

const getCommonBuiltinVariableFields = (
  gtmAccountContainerWorkspacesPairs: {
    accountId: string;
    accountName: string;
    containerId: string;
    containerName: string;
    workspaceId: string;
    workspaceName: string;
  }[]
): Record<string, FieldConfig> => ({
  type: {
    label: 'Variable Type',
    description: 'Select the type of the built-in variable to add.',
    placeholder: 'Select a built-in variable type.',
    type: 'multiSelect',
    options: groupBuiltInVariables,
  },
  accountId: {
    label: 'Account',
    description: 'Select the account associated with the built-in variable.',
    placeholder: 'Select an account.',
    type: 'select',
    options: gtmAccountContainerWorkspacesPairs.map((pair) => ({
      label: pair.accountName,
      value: pair.accountId,
    })),
  },
  containerId: {
    label: 'Container',
    description: 'Select the container associated with the built-in variable.',
    placeholder: 'Select a container.',
    type: 'select',
    options: gtmAccountContainerWorkspacesPairs.map((pair) => ({
      label: pair.containerName,
      value: pair.containerId,
    })),
  },
  workspaceId: {
    label: 'Workspace',
    description: 'Select the workspace associated with the built-in variable.',
    placeholder: 'Select a workspace.',
    type: 'select',
    options: gtmAccountContainerWorkspacesPairs.map((pair) => ({
      label: pair.workspaceName,
      value: pair.workspaceId,
    })),
  },
});

const getCommonVariableFields = (
  gtmAccountContainerWorkspacesPairs: {
    accountId: string;
    accountName: string;
    containerId: string;
    containerName: string;
    workspaceId: string;
    workspaceName: string;
  }[]
): Record<string, FieldConfig> => ({
  name: {
    label: 'Variable Name',
    description: 'Name of Variable.',
    placeholder: 'Name of Variable',
    type: 'text',
  },
  type: {
    label: 'Variable Type',
    description: 'Select the type of variable to add.',
    placeholder: 'Select a variable type.',
    type: 'select',
    options: variableTypeArray.map((item) => ({ label: item.name, value: item.type })),
  },
  accountId: {
    label: 'Account',
    description: 'Select the account associated with the built-in variable.',
    placeholder: 'Select an account.',
    type: 'select',
    options: gtmAccountContainerWorkspacesPairs.map((pair) => ({
      label: pair.accountName,
      value: pair.accountId,
    })),
  },
  containerId: {
    label: 'Container',
    description: 'Select the container associated with the built-in variable.',
    placeholder: 'Select a container.',
    type: 'select',
    options: gtmAccountContainerWorkspacesPairs.map((pair) => ({
      label: pair.containerName,
      value: pair.containerId,
    })),
  },
  workspaceId: {
    label: 'Workspace',
    description: 'Select the workspace associated with the built-in variable.',
    placeholder: 'Select a workspace.',
    type: 'select',
    options: gtmAccountContainerWorkspacesPairs.map((pair) => ({
      label: pair.workspaceName,
      value: pair.workspaceId,
    })),
  },
});

// Refactored GTM Form Field Configs Function
export const gtmFormFieldConfigs = (
  entityType: EntityType,
  formType: FormType,
  remaining: number,
  dataSource?: DataSourceType
): Record<string, FieldConfig> => {
  const isUpdate = formType === 'update';
  const data = !isUpdate && Array.isArray(dataSource) ? dataSource : [];

  const maxOptions = Math.min(remaining, 20);

  switch (entityType) {
    case 'GTMAccount': {
      const commonFields = getCommonAccountFields();

      return {
        ...commonFields,
      };
    }
    case 'GTMContainer': {
      if (isUpdate) {
        // For update, include fields specific to updating GTM containers
        return {
          name: {
            label: 'Container Name',
            description: 'Update the name of the GTM container.',
            placeholder: 'Enter container name.',
            type: 'text',
          },
          accountId: {
            label: 'Account',
            description: 'Update the account associated with the container.',
            placeholder: 'Select an account.',
            type: 'select',
            options: data.map((d) => ({
              label: d.displayName || d.name,
              value: d.name || d.accountId,
            })),
          } as FieldConfig,
          usageContext: {
            label: 'Usage Context',
            description: 'Update the usage context for the container.',
            placeholder: 'Select a usage context.',
            type: 'select',
            options: [
              { label: 'Web', value: 'web' },
              { label: 'Android', value: 'androidSdk5' },
              { label: 'iOS', value: 'iosSdk5' },
              { label: 'Server', value: 'server' },
              { label: 'AMP', value: 'amp' },
            ],
          } as FieldConfig,
          domainName: {
            label: 'Domain Name',
            description: 'Update domain names (comma separated).',
            placeholder: 'Enter domain names.',
            type: 'text',
          },
          notes: {
            label: 'Notes',
            description: 'Update any notes related to the container.',
            placeholder: 'Enter notes.',
            type: 'text',
          },
        };
      } else {
        // For create, include fields specific to creating GTM containers
        return {
          name: {
            label: 'New Container Name',
            description: 'This is the container name you want to create.',
            placeholder: 'Name of the container.',
            type: 'text',
          },
          accountId: {
            label: 'Account',
            description: 'This is the account you want to create the container in.',
            placeholder: 'Select an account.',
            type: 'select',
            options: data.map((d) => ({
              label: d.displayName || d.name,
              value: d.accountId,
            })),
          } as FieldConfig,
          usageContext: {
            label: 'Usage Context',
            description: 'Select the usage context for the container.',
            placeholder: 'Select a usage context.',
            type: 'select',
            options: [
              { label: 'Web', value: 'web' },
              { label: 'Android', value: 'androidSdk5' },
              { label: 'iOS', value: 'iosSdk5' },
              { label: 'Server', value: 'server' },
              { label: 'AMP', value: 'amp' },
            ],
          } as FieldConfig,
          domainName: {
            label: 'Domain Name',
            description: 'Optional. Specify domain names (comma separated).',
            placeholder: 'Enter domain names.',
            type: 'text',
          },
          notes: {
            label: 'Notes',
            description: 'Optional. Add any notes for the container.',
            placeholder: 'Enter notes.',
            type: 'text',
          },
          amount: {
            label: 'How many containers do you want to add?',
            description: 'This is the number of containers you want to create.',
            placeholder: 'Select the number of containers you want to create.',
            type: 'select',
            options: Array.from({ length: remaining }, (_, i) => ({
              label: `${i + 1}`,
              value: `${i + 1}`,
            })),
          } as FieldConfig,
        };
      }
    }

    case 'GTMWorkspace': {
      const accountsWithContainers = dataSource?.accountsWithContainers || [];
      const filteredContainers = dataSource?.filteredContainers || [];
      const commonFields = getCommonWorkspaceFields(accountsWithContainers, filteredContainers);

      if (isUpdate) {
        return {
          name: commonFields.name,
          description: commonFields.description,
        };
      }

      return {
        ...commonFields,
        amount: {
          label: 'How many custom dimensions do you want to add?',
          description: 'This is the number of custom dimensions you want to create.',
          placeholder: 'Select the number of custom dimensions.',
          type: 'select',
          options: Array.from({ length: maxOptions }, (_, i) => ({
            label: `${i + 1}`,
            value: `${i + 1}`,
          })),
        },
      };
    }

    case 'GTMPermissions': {
      if (isUpdate) {
        return {
          ...getEmailFields(),
          ...getEntityFields(),
        };
      }

      return {
        ...getEmailFields(),
        ...getEntityFields(),
        amount: {
          label: 'How many permissions do you want to create?',
          description: 'This is the number of permissions you want to create.',
          placeholder: 'Select the number of permissions.',
          type: 'select',
          options: Array.from({ length: maxOptions }, (_, i) => ({
            label: `${i + 1}`,
            value: `${i + 1}`,
          })),
        },
      };
    }
    case 'GTMBuiltInVariables': {
      const gtmAccountContainerWorkspacesPairs =
        dataSource?.gtmAccountContainerWorkspacesPairs || [];
      const commonFields = getCommonBuiltinVariableFields(gtmAccountContainerWorkspacesPairs);

      if (isUpdate) {
        return {
          ...commonFields,
        };
      }

      return {
        ...commonFields,
        amount: {
          label: 'How many built-in variables do you want to add?',
          description: 'Specify the number of built-in variables to create.',
          placeholder: 'Select the number of variables to create.',
          type: 'select',
          options: Array.from({ length: maxOptions }, (_, i) => ({
            label: `${i + 1}`,
            value: `${i + 1}`,
          })),
        },
      };
    }
    case 'GTMVariables': {
      console.log('dataSource', dataSource);

      const gtmAccountContainerWorkspacesPairs =
        dataSource?.gtmAccountContainerWorkspacesPairs || [];
      const commonFields = getCommonVariableFields(gtmAccountContainerWorkspacesPairs);

      if (isUpdate) {
        return {
          ...commonFields,
        };
      }

      return {
        ...commonFields,
        amount: {
          label: 'How many built-in variables do you want to add?',
          description: 'Specify the number of built-in variables to create.',
          placeholder: 'Select the number of variables to create.',
          type: 'select',
          options: Array.from({ length: maxOptions }, (_, i) => ({
            label: `${i + 1}`,
            value: `${i + 1}`,
          })),
        },
      };
    }
    default:
      throw new Error(`Unsupported GTM entity type: ${entityType}`);
  }
};
