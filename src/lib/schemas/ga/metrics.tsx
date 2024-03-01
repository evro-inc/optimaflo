import { z } from 'zod';

const MeasurementUnitSchema = z.enum([
  'MEASUREMENT_UNIT_UNSPECIFIED',
  'STANDARD',
  'CURRENCY',
  'FEET',
  'METERS',
  'KILOMETERS',
  'MILES',
  'MILLISECONDS',
  'SECONDS',
  'MINUTES',
  'HOURS',
]);

const MetricScopeSchema = z.enum(['METRIC_SCOPE_UNSPECIFIED', 'EVENT']);

const RestrictedMetricTypeSchema = z.enum([
  'RESTRICTED_METRIC_TYPE_UNSPECIFIED',
  'COST_DATA',
  'REVENUE_DATA',
]);

const SingleFormSchema = z.object({
  name: z.string(),
  account: z.string(),
  property: z.string(),
  parameterName: z
    .string()
    .max(40)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, {
      message: 'Must start with a letter and contain only alphanumeric and underscore characters.',
    }),
  displayName: z
    .string()
    .min(1)
    .max(82)
    .regex(/^[A-Za-z][A-Za-z0-9_ ]*$/, {
      message:
        'Must start with a letter and contain only alphanumeric, space, and underscore characters.',
    }),
  description: z.string().max(150).optional(),
  measurementUnit: MeasurementUnitSchema,
  scope: MetricScopeSchema,
  restrictedMetricType: z.array(RestrictedMetricTypeSchema).optional(),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomMetric objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from CustomMetricsSchema for type safety
export type CustomMetricSchemaType = z.infer<typeof FormsSchema>;
