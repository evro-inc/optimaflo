export const DataRestrictions = [
  {
    id: 'predefinedRoles/no-cost-data',
    label: 'No Cost Metrics - No access to cost-related metrics for account. GA4 only.',
  },
  {
    id: 'predefinedRoles/no-revenue-data',
    label: 'No Revenue Metrics - No access to revenue-related metrics for account. GA4 only.',
  },
];

export const Roles = [
  {
    id: ['predefinedRoles/viewer'],
    label: 'Viewer - See report data and configuration settings for account.',
  },
  {
    id: ['predefinedRoles/analyst'],
    label:
      'Analyst - Create and edit shared assets like dashboards and annotations for account. Includes Viewer role.',
  },
  {
    id: ['predefinedRoles/editor'],
    label: 'Editor - Edit all data and settings for account. Cannot manage users.',
  },
  {
    id: ['predefinedRoles/admin'],
    label: 'Admin - Full control of account.',
  },
];
