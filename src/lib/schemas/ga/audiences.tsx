import { z } from 'zod';

// Enums as Zod enums
export const AudienceExclusionDurationMode = z.enum([
  'AUDIENCE_EXCLUSION_DURATION_MODE_UNSPECIFIED',
  'EXCLUDE_TEMPORARILY',
  'EXCLUDE_PERMANENTLY',
]);

const AudienceClauseType = z.enum([
  'AUDIENCE_CLAUSE_TYPE_UNSPECIFIED',
  'INCLUDE',
  'EXCLUDE',
]);

const LogCondition = z.enum([
  'LOG_CONDITION_UNSPECIFIED',
  'AUDIENCE_JOINED',
  'AUDIENCE_MEMBERSHIP_RENEWED',
]);

const AudienceFilterScope = z.enum([
  'AUDIENCE_FILTER_SCOPE_UNSPECIFIED',
  'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_EVENT',
  'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_SESSION',
  'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
]);

const MatchType = z.enum([
  'MATCH_TYPE_UNSPECIFIED',
  'EXACT',
  'BEGINS_WITH',
  'ENDS_WITH',
  'CONTAINS',
  'FULL_REGEXP',
]);

const Operation = z.enum([
  'OPERATION_UNSPECIFIED',
  'EQUAL',
  'LESS_THAN',
  'GREATER_THAN',
]);

// Nested object schemas
const AudienceEventTriggerSchema = z.object({
  eventName: z.string(),
  logCondition: LogCondition,
});

const StringFilterSchema = z.object({
  matchType: MatchType,
  value: z.string(),
  caseSensitive: z.boolean().optional(),
});

const InListFilterSchema = z.object({
  values: z.array(z.string()),
  caseSensitive: z.boolean().optional(),
});

const NumericValueSchema = z.union([
  z.object({ int64Value: z.string() }),
  z.object({ doubleValue: z.number() }),
]);

const NumericFilterSchema = z.object({
  operation: Operation,
  value: NumericValueSchema,
});

const BetweenFilterSchema = z.object({
  fromValue: NumericValueSchema,
  toValue: NumericValueSchema,
});

// Recursive definitions
const AudienceFilterExpressionSchema: z.ZodSchema<AudienceFilterExpression> = z.lazy(() => z.object({
  andGroup: AudienceFilterExpressionListSchema.optional(),
  orGroup: AudienceFilterExpressionListSchema.optional(),
  notExpression: AudienceFilterExpressionSchema.optional(),
  dimensionOrMetricFilter: AudienceDimensionOrMetricFilterSchema.optional(),
  eventFilter: AudienceEventFilterSchema.optional(),
}));

const AudienceFilterExpressionListSchema = z.object({
  filterExpressions: z.array(AudienceFilterExpressionSchema),
});

const AudienceDimensionOrMetricFilterSchema = z.object({
  fieldName: z.string(),
  atAnyPointInTime: z.boolean().optional(),
  inAnyNDayPeriod: z.number().optional(),
  stringFilter: StringFilterSchema.optional(),
  inListFilter: InListFilterSchema.optional(),
  numericFilter: NumericFilterSchema.optional(),
  betweenFilter: BetweenFilterSchema.optional(),
});

const AudienceEventFilterSchema = z.object({
  eventName: z.string(),
  eventParameterFilterExpression: AudienceFilterExpressionSchema.optional(),
});

const AudienceSimpleFilterSchema = z.object({
  scope: AudienceFilterScope,
  filterExpression: AudienceFilterExpressionSchema,
});

const AudienceSequenceStepSchema = z.object({
  scope: AudienceFilterScope,
  immediatelyFollows: z.boolean().optional(),
  constraintDuration: z.string().optional(), // This should ideally be validated as a duration
  filterExpression: AudienceFilterExpressionSchema,
});

const AudienceSequenceFilterSchema = z.object({
  scope: AudienceFilterScope,
  sequenceMaximumDuration: z.string().optional(), // This should ideally be validated as a duration
  sequenceSteps: z.array(AudienceSequenceStepSchema),
});

const AudienceFilterClauseSchema = z.object({
  clauseType: AudienceClauseType,
  simpleFilter: AudienceSimpleFilterSchema.optional(),
  sequenceFilter: AudienceSequenceFilterSchema.optional(),
});


const SingleFormSchema = z.object({
  account: z.string(),
  property: z.string(),
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  membershipDurationDays: z.number(),
  adsPersonalizationEnabled: z.boolean(),
  eventTrigger: AudienceEventTriggerSchema.optional(),
  exclusionDurationMode: AudienceExclusionDurationMode,
  filterClauses: z.array(AudienceFilterClauseSchema),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});
// If you need to validate an array of CustomConversion objects like in your original FormsSchema
export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type Audience = z.infer<typeof FormsSchema>;
