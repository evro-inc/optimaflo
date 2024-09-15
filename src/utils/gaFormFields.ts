/* import { GA4PropertyType } from '@/src/types/types';
 */
import { DimensionScopeType } from '../app/(dashboards)/dashboard/ga/properties/@dimensions/dimensionItems';
import {
  CurrencyCodes,
  IndustryCategories,
  /*     retentionSettings360,
            retentionSettingsStandard, */
  TimeZones,
} from '../app/(dashboards)/dashboard/ga/properties/@properties/propertyItems';

// Define the possible field types for the form
type FieldType = 'select' | 'text' | 'switch';
type entityType = 'GA4Property' | 'GAEvent' | 'GA4Streams' | 'GA4CustomDimensions';
type formType = 'create' | 'update' | 'switch';

// Define the structure of your field configuration
interface FieldConfig {
  label: string;
  description: string;
  placeholder: string;
  type?: FieldType;
  options?: { label: string; value: string }[];
}

// Define a generic type for data source, allowing flexibility
type DataSourceType = Record<string, any> | Record<string, any>[];

// Utility function to get common fields
const getCommonPropertyFields = (
  accountsWithProperties: { displayName: string; name: string }[]
): Record<string, FieldConfig> => ({
  displayName: {
    label: 'Property Name',
    description: 'This is the property name.',
    placeholder: 'Name of the property.',
    type: 'text',
  },
  parent: {
    label: 'Account',
    description: 'This is the account you want to associate with the property.',
    placeholder: 'Select an account.',
    type: 'select',
    options: accountsWithProperties.map((account) => ({
      label: account.displayName,
      value: account.name,
    })),
  },
  currencyCode: {
    label: 'Currency',
    description: 'Select the currency for the property.',
    placeholder: 'Select a currency.',
    type: 'select',
    options: CurrencyCodes.map((code) => ({
      label: code,
      value: code,
    })),
  },
  timeZone: {
    label: 'Time Zone',
    description: 'Select the time zone for the property.',
    placeholder: 'Select a time zone.',
    type: 'select',
    options: TimeZones.map((timeZone) => ({
      label: timeZone,
      value: timeZone,
    })),
  },
  industryCategory: {
    label: 'Category',
    description: 'Select the industry category for the property.',
    placeholder: 'Select a category.',
    type: 'select',
    options: Object.entries(IndustryCategories).map(([label, value]) => ({
      label,
      value,
    })),
  },
});

const getCommonStreamsFields = (
  accountsWithProperties: { displayName: string; name: string }[],
  filteredProperties: { displayName: string; name: string }[],
  streamType: Record<string, string> // Stream type options, e.g., { Web: 'WEB', Android: 'ANDROID', iOS: 'IOS' }
): Record<string, FieldConfig> => ({
  displayName: {
    label: 'Stream Name',
    description: 'This is the stream name you want to create.',
    placeholder: 'Name of the stream.',
    type: 'text',
  },
  account: {
    label: 'Account',
    description: 'This is the account you want to associate with the property.',
    placeholder: 'Select an account.',
    type: 'select',
    options: accountsWithProperties.map((account) => ({
      label: account.displayName,
      value: account.name,
    })),
  },
  property: {
    label: 'Property',
    description: 'Which property do you want to create the stream in?',
    placeholder: 'Select a property.',
    type: 'select',
    options: filteredProperties.map((property) => ({
      label: property.displayName,
      value: property.name,
    })),
  },

  type: {
    label: 'Stream Type',
    description: 'Select the type of stream you want to create.',
    placeholder: 'Select a stream type.',
    type: 'select',
    options: Object.entries(streamType).map(([value, label]) => ({
      label, // The display name (e.g., 'Web', 'Android', etc.)
      value, // The key (e.g., 'WEB_DATA_STREAM', 'ANDROID_APP_DATA_STREAM', etc.)
    })),
  },
});

// Old form fields integration for GA4CustomDimensions
const getGA4CustomDimensionsFields = (
  accountsWithProperties: { displayName: string; name: string }[],
  filteredProperties: { displayName: string; name: string }[]
): Record<string, FieldConfig> => ({
  account: {
    label: 'Account',
    description: 'This is the account you want to create the property in.',
    placeholder: 'Select an account.',
    type: 'select',
    options: accountsWithProperties.map((account) => ({
      label: account.displayName,
      value: account.name,
    })),
  },
  property: {
    label: 'Property',
    description: 'Which property do you want to create the custom dimension in?',
    placeholder: 'Select a property.',
    type: 'select',
    options: filteredProperties.map((property) => ({
      label: property.displayName,
      value: property.name,
    })),
  },
  displayName: {
    label: 'New Custom Dimension Name',
    description: 'This is the custom dimension name you want to create.',
    placeholder: 'Name of the custom dimension.',
    type: 'text',
  },
  parameterName: {
    label: 'Parameter Name',
    description: 'Tagging parameter name for this custom dimension.',
    placeholder: 'Name of the parameter.',
    type: 'text',
  },
  scope: {
    label: 'Scope',
    description: 'The scope of this dimension.',
    placeholder: 'Select a custom dimension type.',
    type: 'select',
    options: Object.entries(DimensionScopeType).map(([label, value]) => ({
      label,
      value,
    })),
  },
  description: {
    label: 'Description Name',
    description: 'Max length of 150 characters.',
    placeholder: 'Description of the custom dimension.',
    type: 'text',
  },
  disallowAdsPersonalization: {
    label: 'Disallow Ads Personalization',
    description: 'If true, sets this dimension as NPA and excludes it from ads personalization.',
    type: 'switch',
    placeholder: 'Disallow Ads Personalization',
  },
});

export const gaFormFieldConfigs = (
  entityType: entityType, // Add more GA entity types as needed
  formType: formType,
  remaining: number,
  dataSource?: DataSourceType
): Record<string, FieldConfig> => {
  const isUpdate = formType === 'update';
  const accountsWithProperties = !isUpdate && Array.isArray(dataSource) ? dataSource : [];
  //const selectedRowData = isUpdate && !Array.isArray(dataSource) ? (dataSource as Record<string, any>) : {};

  const maxOptions = Math.min(remaining, 20);

  switch (entityType) {
    case 'GA4Property': {
      const commonFields = getCommonPropertyFields(accountsWithProperties);
      //const retentionFields = getCreateFields();

      if (isUpdate) {
        //const updateFields = getUpdateFields(selectedRowData);
        // Merge common fields with update-specific fields
        return {
          ...commonFields,
          //...updateFields,
        };
      } else {
        return {
          ...commonFields,
          //...retentionFields,
          amount: {
            label: 'How many properties do you want to add?',
            description: 'This is the number of properties you want to create.',
            placeholder: 'Select the number of properties you want to create.',
            type: 'select',
            options: Array.from({ length: maxOptions }, (_, i) => ({
              label: `${i + 1}`,
              value: `${i + 1}`,
            })),
          },
        };
      }
    }
    case 'GA4Streams': {
      // Log to ensure dataSource is correctly passed
      console.log('dataSource 4', dataSource);

      const accountsWithProperties = dataSource?.accountsWithProperties || [];
      const filteredProperties = dataSource?.filteredProperties || [];
      const streamType = dataSource?.type || {};

      const commonFields = getCommonStreamsFields(
        accountsWithProperties,
        filteredProperties, // Use filteredProperties in the field config
        streamType
      );

      if (isUpdate) {
        return {
          ...commonFields,
        };
      } else {
        return {
          ...commonFields,
          amount: {
            label: 'How many streams do you want to add?',
            description: 'This is the number of streams you want to create.',
            placeholder: 'Select the number of streams you want to create.',
            type: 'select',
            options: Array.from({ length: maxOptions }, (_, i) => ({
              label: `${i + 1}`,
              value: `${i + 1}`,
            })),
          },
        };
      }
    }

    case 'GA4CustomDimensions': {
      // Extract accountsWithProperties from dataSource if it exists
      const accountsWithProperties = dataSource?.accountsWithProperties || [];

      // Extract filteredProperties from dataSource if it exists
      const filteredProperties = dataSource?.filteredProperties || [];

      // Use the helper function to define fields for GA4CustomDimensions
      const commonFields = getGA4CustomDimensionsFields(accountsWithProperties, filteredProperties);

      if (isUpdate) {
        return {
          ...commonFields, // Return only the common fields in case of update
        };
      } else {
        return {
          ...commonFields, // Return common fields and an additional 'amount' field for creation
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
    }

    default: {
      throw new Error(`Unsupported GA entity type: ${entityType}`);
    }
  }
};
