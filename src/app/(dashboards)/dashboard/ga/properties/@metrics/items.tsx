export const measurementUnit = {
  Standard: 'STANDARD',
  Currency: 'CURRENCY',
  Feet: 'FEET',
  Meters: 'METERS',
  Kilometers: 'KILOMETERS',
  Miles: 'MILES',
  Milliseconds: 'MILLISECONDS',
  Seconds: 'SECONDS',
  Minutes: 'MINUTES',
  Hours: 'HOURS',
} as const;

export const RestrictedMetric = {
  cost: 'COST_DATA',
  revenue: 'REVENUE_DATA',
};
