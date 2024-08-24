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

// Define the structure of your field configuration
interface FieldConfig {
    label: string;
    description: string;
    placeholder: string;
    type?: FieldType;
    options?: { label: string; value: string }[];
}

// Dynamic field configuration generator
export const formFieldConfigs = (
    formType: 'create' | 'update' | 'switch',
    remaining: number,
    dataSource?: GA4PropertyType[] | Record<string, GA4PropertyType>
): Record<string, FieldConfig> => {
    const isUpdate = formType === 'update';
    const accountsWithProperties = !isUpdate ? (dataSource as GA4PropertyType[]) : [];
    const selectedRowData = isUpdate ? (dataSource as Record<string, GA4PropertyType>) : {};

    const commonFields = {
        displayName: {
            label: 'New Property Name',
            description: 'This is the property name you want to create.',
            placeholder: 'Name of the property.',
        } as FieldConfig,
        parent: {
            label: 'Account',
            description: 'This is the account you want to create the property in.',
            placeholder: 'Select an account.',
            type: 'select',
            options: isUpdate
                ? Object.values(selectedRowData).map((rowData) => ({
                    label: rowData.displayName,
                    value: rowData.name,
                }))
                : accountsWithProperties.map((account) => ({
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
            description: 'Which timeZone do you want to include in the property?',
            placeholder: 'Select a timeZone.',
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
    };

    if (isUpdate) {
        // Use a Set to collect unique retention options
        const uniqueRetentionOptions = new Set<string>();

        // Determine the retention options based on serviceLevel
        Object.entries(selectedRowData).forEach(([key, rowData]) => {
            const retentionSettings =
                rowData.serviceLevel === 'Standard' ? retentionSettingsStandard : retentionSettings360;
            Object.entries(retentionSettings || {}).forEach(([label, value]) => {
                uniqueRetentionOptions.add(JSON.stringify({ label, value })); // Add as a JSON string for uniqueness
            });
        });

        // Convert the Set back to an array of objects
        const retentionOptions = Array.from(uniqueRetentionOptions).map((item) => JSON.parse(item));

        return {
            ...commonFields,
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
            } as FieldConfig,
        };
    } else {
        return {
            ...commonFields,
            amount: {
                label: 'How many properties do you want to add?',
                description: 'This is the amount of properties you want to create.',
                placeholder: 'Select the amount of properties you want to create.',
                type: 'select',
                options: Array.from({ length: remaining }, (_, i) => ({
                    label: `${i + 1}`,
                    value: `${i + 1}`,
                })),
            } as FieldConfig,
        };
    }
};
