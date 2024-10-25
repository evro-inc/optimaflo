/* import { GA4PropertyType } from '@/src/types/types';
 */
import { DimensionScopeType } from '../app/(dashboards)/dashboard/ga/properties/@dimensions/dimensionItems';
import { CountMethodData } from '../app/(dashboards)/dashboard/ga/properties/@keyEvents/items';
import {
  measurementUnit,
  RestrictedMetric,
} from '../app/(dashboards)/dashboard/ga/properties/@metrics/items';
import {
  CurrencyCodes,
  IndustryCategories,
  /*     retentionSettings360,
                retentionSettingsStandard, */
  TimeZones,
} from '../app/(dashboards)/dashboard/ga/properties/@properties/propertyItems';

type FieldType = 'select' | 'text' | 'switch' | 'radio';
type entityType =
  | 'GA4Property'
  | 'GAEvent'
  | 'GA4Streams'
  | 'GA4CustomDimensions'
  | 'GA4CustomMetrics'
  | 'GA4KeyEvents'
  | 'GA4Audiences';
type formType = 'create' | 'update' | 'switch';

interface FieldConfig {
  label: string;
  description: string;
  placeholder: string;
  type?: FieldType;
  options?: { label: string; value: string }[];
  disabled?: boolean;
}

type DataSourceType = any;

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
  streamType: Record<string, string>,
  watchedValue?: string
): Record<string, FieldConfig> => {
  const fields: Record<string, FieldConfig> = {
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
  };
  if (watchedValue) {
    if (watchedValue === 'WEB_DATA_STREAM') {
      fields['webStreamData.defaultUri'] = {
        label: 'Default URI',
        description: 'This is the default URI for the web stream.',
        placeholder: 'Enter default URI',
        type: 'text',
      };
    } else if (watchedValue === 'ANDROID_APP_DATA_STREAM') {
      fields['androidAppStreamData.packageName'] = {
        label: 'Package Name',
        description: 'This is the package name for the Android app stream.',
        placeholder: 'Enter Package Name',
        type: 'text',
      };
    } else if (watchedValue === 'IOS_APP_DATA_STREAM') {
      fields['iosAppStreamData.bundleId'] = {
        label: 'Bundle ID',
        description: 'This is the bundle ID for the iOS app stream.',
        placeholder: 'Enter Bundle ID',
        type: 'text',
      };
    }
  }
  return fields;
};

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

const getGA4CustomMetricsFields = (
  watchedValue?: string,
  formType?: string
): Record<string, FieldConfig> => {
  const fields: Record<string, FieldConfig> = {
    displayName: {
      label: 'New Custom Metric Name',
      description: 'This is the custom metric name you want to create.',
      placeholder: 'Name of the custom metric.',
      type: 'text',
    },
    parameterName: {
      label: 'Parameter Name',
      description: 'Tagging parameter name for this custom metric.',
      placeholder: 'Name of the parameter.',
      type: 'text',
    },
    measurementUnit: {
      label: 'Measurement Unit',
      description: 'The type of this measurement.',
      placeholder: 'Select a measurement type.',
      type: 'select',
      options: Object.entries(measurementUnit)
        .filter(([value]) => formType !== 'update' || value !== 'CURRENCY') // Only filter 'CURRENCY' during updates
        .map(([label, value]) => ({
          label,
          value,
        })),
    },

    description: {
      label: 'Description Name',
      description: 'Max length of 150 characters.',
      placeholder: 'Description of the custom metric.',
      type: 'text',
    },
  };
  if (watchedValue === 'CURRENCY') {
    fields.restrictedMetricType = {
      label: 'Restricted Metric Type',
      description:
        'Optional. Types of restricted data that this metric may contain.Required for metrics with CURRENCY measurement unit.Must be empty for metrics with a non- CURRENCY measurement unit.',
      placeholder: 'Select a custom metric type.',
      type: 'select',
      options: Object.entries(RestrictedMetric).map(([label, value]) => ({
        label,
        value,
      })),
    };
  }

  return fields;
};

const getCommonKeyEventFields = (
  accountsWithProperties: { displayName: string; name: string }[],
  filteredProperties: { displayName: string; name: string }[],
  includeDefaultValue?: string
): Record<string, FieldConfig> => {
  const fields: Record<string, FieldConfig> = {
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
      description: 'Select a property for this key event.',
      placeholder: 'Select a property.',
      type: 'select',
      options: filteredProperties.map((property) => ({
        label: property.displayName,
        value: property.name,
      })),
    },
    eventName: {
      label: 'Key Event Name',
      description: 'This is the key event name you want to create.',
      placeholder: 'Enter the key event name.',
      type: 'text',
    },
    countingMethod: {
      label: 'Counting Method',
      description: 'The method for counting key events within a session.',
      placeholder: 'Select counting method.',
      type: 'select',
      options: Object.entries(CountMethodData).map(([label, value]) => ({
        label,
        value,
      })),
    },
    includeDefaultValue: {
      label: 'Default Conversion Value',
      description: 'Set a default conversion value for the key event.',
      placeholder: 'Select default value option.',
      type: 'radio',
      options: [
        { label: 'No Default Value', value: 'false' },
        { label: 'Set Default Value', value: 'true' },
      ],
    },
  };

  // Conditionally add numeric value and currency code fields
  if (includeDefaultValue === 'true') {
    fields['defaultValue.numericValue'] = {
      label: 'Default Numeric Value',
      description: 'Enter the default numeric value for this event.',
      placeholder: 'Enter value',
      type: 'text',
    };
    fields['defaultValue.currencyCode'] = {
      label: 'Currency Code',
      description: 'Select the currency for the default value.',
      placeholder: 'Select currency',
      type: 'select',
      options: CurrencyCodes.map((code) => ({
        label: code,
        value: code,
      })),
    };
  }

  return fields;
};








const getCommonAudienceFields = (
  accountsWithProperties: { displayName: string; name: string }[],
  filteredProperties: { displayName: string; name: string }[],
  includeDefaultValue?: string
): Record<string, FieldConfig> => {
  const fields: Record<string, FieldConfig> = {
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
      description: 'Select a property for this key event.',
      placeholder: 'Select a property.',
      type: 'select',
      options: filteredProperties.map((property) => ({
        label: property.displayName,
        value: property.name,
      })),
    },
    eventName: {
      label: 'Key Event Name',
      description: 'This is the key event name you want to create.',
      placeholder: 'Enter the key event name.',
      type: 'text',
    },
    countingMethod: {
      label: 'Counting Method',
      description: 'The method for counting key events within a session.',
      placeholder: 'Select counting method.',
      type: 'select',
      options: Object.entries(CountMethodData).map(([label, value]) => ({
        label,
        value,
      })),
    },
    includeDefaultValue: {
      label: 'Default Conversion Value',
      description: 'Set a default conversion value for the key event.',
      placeholder: 'Select default value option.',
      type: 'radio',
      options: [
        { label: 'No Default Value', value: 'false' },
        { label: 'Set Default Value', value: 'true' },
      ],
    },
  };

  // Conditionally add numeric value and currency code fields
  if (includeDefaultValue === 'true') {
    fields['defaultValue.numericValue'] = {
      label: 'Default Numeric Value',
      description: 'Enter the default numeric value for this event.',
      placeholder: 'Enter value',
      type: 'text',
    };
    fields['defaultValue.currencyCode'] = {
      label: 'Currency Code',
      description: 'Select the currency for the default value.',
      placeholder: 'Select currency',
      type: 'select',
      options: CurrencyCodes.map((code) => ({
        label: code,
        value: code,
      })),
    };
  }

  return fields;
};




export const gaFormFieldConfigs = (
  entityType: entityType, // Add more GA entity types as needed
  formType: formType,
  remaining: number,
  dataSource?: DataSourceType,
  watched?: string
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

      const accountsWithProperties = dataSource?.accountsWithProperties || [];
      const filteredProperties = dataSource?.filteredProperties || [];
      const streamType = dataSource?.type || {};

      const commonFields = getCommonStreamsFields(
        accountsWithProperties,
        filteredProperties, // Use filteredProperties in the field config
        streamType,
        watched
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
      const accountsWithProperties = dataSource?.accountsWithProperties || [];
      const filteredProperties = dataSource?.filteredProperties || [];
      const commonFields = getGA4CustomDimensionsFields(accountsWithProperties, filteredProperties);

      if (isUpdate) {
        return {
          displayName: commonFields.displayName,
          description: commonFields.description,
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

    case 'GA4CustomMetrics': {
      const commonFields = getGA4CustomMetricsFields(watched, formType);

      if (isUpdate) {
        return { ...commonFields };
      } else {
        return {
          ...commonFields, // Return common fields and an additional 'amount' field for creation
          amount: {
            label: 'How many custom metrics do you want to add?',
            description: 'This is the number of custom metrics you want to create.',
            placeholder: 'Select the number of custom metrics.',
            type: 'select',
            options: Array.from({ length: maxOptions }, (_, i) => ({
              label: `${i + 1}`,
              value: `${i + 1}`,
            })),
          },
        };
      }
    }

    case 'GA4KeyEvents': {
      const accountsWithProperties = dataSource?.accountsWithProperties || [];
      const filteredProperties = dataSource?.filteredProperties || [];
      const commonFields = getCommonKeyEventFields(
        accountsWithProperties,
        filteredProperties,
        watched
      );

      if (isUpdate) {
        return { ...commonFields };
      } else {
        return {
          ...commonFields, // Return common fields and an additional 'amount' field for creation
          amount: {
            label: 'How many custom metrics do you want to add?',
            description: 'This is the number of custom metrics you want to create.',
            placeholder: 'Select the number of custom metrics.',
            type: 'select',
            options: Array.from({ length: maxOptions }, (_, i) => ({
              label: `${i + 1}`,
              value: `${i + 1}`,
            })),
          },
        };
      }
    }

    case 'GA4Audiences': {
      const accountsWithProperties = dataSource?.accountsWithProperties || [];
      const filteredProperties = dataSource?.filteredProperties || [];
      const commonFields = getCommonAudienceFields(
        accountsWithProperties,
        filteredProperties,
        watched
      );

      if (isUpdate) {
        return { ...commonFields };
      } else {
        return {
          ...commonFields, // Return common fields and an additional 'amount' field for creation
          amount: {
            label: 'How many custom metrics do you want to add?',
            description: 'This is the number of custom metrics you want to create.',
            placeholder: 'Select the number of custom metrics.',
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
