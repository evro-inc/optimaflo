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

export const gaFormFieldConfigs = (
    entityType: entityType,  // Add more GA entity types as needed
    formType: formType,
    remaining: number,
    dataSource?: DataSourceType
): Record<string, FieldConfig> => {
    const isUpdate = formType === 'update';
    const accountsWithProperties = !isUpdate && Array.isArray(dataSource) ? dataSource : [];
    const selectedRowData = isUpdate && !Array.isArray(dataSource) ? (dataSource as Record<string, any>) : {};

    switch (entityType) {
        case 'GA4Property':
            if (isUpdate) {
                const selectedRowDataTyped = selectedRowData as Record<string, GA4PropertyType>;

                // For update, return only retention and resetOnNewActivity fields
                const uniqueRetentionOptions = new Set<string>();

                Object.entries(selectedRowDataTyped).forEach(([key, rowData]) => {
                    const retentionSettings =
                        rowData.serviceLevel === 'Standard' ? retentionSettingsStandard : retentionSettings360;
                    Object.entries(retentionSettings || {}).forEach(([label, value]) => {
                        uniqueRetentionOptions.add(JSON.stringify({ label, value }));
                    });
                });

                const retentionOptions = Array.from(uniqueRetentionOptions).map((item) => JSON.parse(item));

                return {
                    retention: {
                        label: 'Retention Setting',
                        description: 'Set the retention setting for the property.',
                        placeholder: 'Select a retention setting.',
                        type: 'select',
                        options: retentionOptions,
                    } as FieldConfig,
                    resetOnNewActivity: {
                        label: 'Reset user data on new activity',
                        description:
                            'If enabled, reset the retention period for the user identifier with every event from that user.',
                        type: 'switch',
                        placeholder: '',
                    } as FieldConfig,
                };
            } else {
                // For create, include common fields and the amount field
                return {
                    displayName: {
                        label: 'New Property Name',
                        description: 'This is the property name you want to create.',
                        placeholder: 'Name of the property.',
                        type: 'text',
                    },
                    parent: {
                        label: 'Account',
                        description: 'This is the account you want to create the property in.',
                        placeholder: 'Select an account.',
                        type: 'select',
                        options: accountsWithProperties.map((account) => ({
                            label: account.displayName,
                            value: account.name,
                        })),
                    } as FieldConfig,
                    currencyCode: {
                        label: 'Currency',
                        description: 'Which currency do you want to include in the property?',
                        placeholder: 'Select a currency.',
                        type: 'select',
                        options: CurrencyCodes.map((code) => ({
                            label: code,
                            value: code,
                        })),
                    } as FieldConfig,
                    timeZone: {
                        label: 'Time Zone',
                        description: 'Which time zone do you want to include in the property?',
                        placeholder: 'Select a time zone.',
                        type: 'select',
                        options: TimeZones.map((timeZone) => ({
                            label: timeZone,
                            value: timeZone,
                        })),
                    } as FieldConfig,
                    industryCategory: {
                        label: 'Category',
                        description: 'Which category do you want to include in the property?',
                        placeholder: 'Select a category.',
                        type: 'select',
                        options: Object.entries(IndustryCategories).map(([label, value]) => ({
                            label,
                            value,
                        })),
                    } as FieldConfig,
                    amount: {
                        label: 'How many properties do you want to add?',
                        description: 'This is the number of properties you want to create.',
                        placeholder: 'Select the number of properties you want to create.',
                        type: 'select',
                        options: Array.from({ length: remaining }, (_, i) => ({
                            label: `${i + 1}`,
                            value: `${i + 1}`,
                        })),
                    } as FieldConfig,
                };
            }

        // Add more GA entity cases as needed

        default:
            throw new Error(`Unsupported GA entity type: ${entityType}`);
    }
};


