// GTM-specific field configurations

// Define the possible field types for the form
type FieldType = 'select' | 'text' | 'switch';
type EntityType = 'GTMAccount' | 'GTMContainer' | 'GTMWorkspace';
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
    default:
      throw new Error(`Unsupported GTM entity type: ${entityType}`);
  }
};
