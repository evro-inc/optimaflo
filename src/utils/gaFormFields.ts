import { GA4PropertyType } from '@/src/types/types';
import {
    CurrencyCodes,
    IndustryCategories,
    retentionSettings360,
    retentionSettingsStandard,
    TimeZones,
} from '../app/(dashboards)/dashboard/ga/properties/@properties/propertyItems';

// Define the possible field types for the form
type FieldType = 'select' | 'text' | 'switch';
type entityType = 'GA4Property' | 'GAEvent';
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
const getCommonFields = (
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

// Utility function to get the update-specific fields
const getUpdateFields = (
    selectedRowData: Record<string, GA4PropertyType>
): Record<string, FieldConfig> => {
    const uniqueRetentionOptions = new Set<string>();

    Object.entries(selectedRowData).forEach(([, rowData]) => {
        const retentionSettings =
            rowData.serviceLevel === 'Standard' ? retentionSettingsStandard : retentionSettings360;
        Object.entries(retentionSettings || {}).forEach(([label, value]) => {
            uniqueRetentionOptions.add(JSON.stringify({ label, value }));
        });
    });

    const retentionOptions = Array.from(uniqueRetentionOptions).map((item) =>
        JSON.parse(item)
    );

    return {
        retention: {
            label: 'Retention Setting',
            description: 'Set the retention setting for the property.',
            placeholder: 'Select a retention setting.',
            type: 'select',
            options: retentionOptions,
        },
        resetOnNewActivity: {
            label: 'Reset user data on new activity',
            description:
                'If enabled, reset the retention period for the user identifier with every event from that user.',
            type: 'switch',
            placeholder: '',
        },
    };
};

export const gaFormFieldConfigs = (
    entityType: entityType, // Add more GA entity types as needed
    formType: formType,
    remaining: number,
    dataSource?: DataSourceType
): Record<string, FieldConfig> => {
    const isUpdate = formType === 'update';
    const accountsWithProperties = !isUpdate && Array.isArray(dataSource) ? dataSource : [];
    const selectedRowData = isUpdate && !Array.isArray(dataSource) ? (dataSource as Record<string, any>) : {};
    console.log('Amount options:', Array.from({ length: remaining }, (_, i) => ({
        label: `${i + 1}`,
        value: `${i + 1}`,
    })));

    const maxProperties = Math.min(remaining, 20);

    switch (entityType) {
        case 'GA4Property': {
            const commonFields = getCommonFields(accountsWithProperties);

            if (isUpdate) {
                const updateFields = getUpdateFields(selectedRowData);
                // Merge common fields with update-specific fields
                return {
                    ...commonFields,
                    ...updateFields,
                };
            } else {
                return {
                    ...commonFields,
                    amount: {
                        label: 'How many properties do you want to add?',
                        description: 'This is the number of properties you want to create.',
                        placeholder: 'Select the number of properties you want to create.',
                        type: 'select',
                        options: Array.from({ length: maxProperties }, (_, i) => ({
                            label: `${i + 1}`,
                            value: `${i + 1}`,
                        })),
                    },
                };
            }
        }
        // Add more GA entity cases as needed

        default: {
            throw new Error(`Unsupported GA entity type: ${entityType}`);
        }
    }
};
