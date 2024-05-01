import { z } from 'zod';

const LogCondition = z.enum([
  'LOG_CONDITION_UNSPECIFIED',
  'AUDIENCE_JOINED',
  'AUDIENCE_MEMBERSHIP_RENEWED',
]);
const AudienceExclusionDurationMode = z.enum([
  'AUDIENCE_EXCLUSION_DURATION_MODE_UNSPECIFIED',
  'EXCLUDE_TEMPORARILY',
  'EXCLUDE_PERMANENTLY',
]);
const AudienceClauseType = z.enum(['INCLUDE', 'EXCLUDE']);
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
const Operation = z.enum(['OPERATION_UNSPECIFIED', 'EQUAL', 'LESS_THAN', 'GREATER_THAN']);

const StringFilter = z.object({
  matchType: MatchType,
  value: z.string(),
  caseSensitive: z.boolean().optional(),
});

const InListFilter = z.object({
  values: z.array(z.string()),
  caseSensitive: z.boolean().optional(),
});

const NumericValue = z.union([
  z.object({ int64Value: z.string() }),
  z.object({ doubleValue: z.number() }),
]);

const NumericFilter = z.object({
  operation: Operation,
  value: NumericValue,
});

const BetweenFilter = z.object({
  fromValue: NumericValue,
  toValue: NumericValue,
});

const AudienceDimensionOrMetricFilter = z.object({
  fieldName: z.string(),
  atAnyPointInTime: z.boolean().optional(),
  inAnyNDayPeriod: z.number().optional(),
  /* one_filter: z.union([StringFilter, InListFilter, NumericFilter, BetweenFilter]), */
  stringFilter: StringFilter.optional(),
});

const AudienceFilterExpression = z.lazy(() =>
  z.object({
    andGroup: z
      .object({ filterExpressions: z.array(AudienceFilterExpression).optional() })
      .optional(),
    orGroup: z
      .object({ filterExpressions: z.array(AudienceFilterExpression).optional() })
      .optional(),
    notExpression: AudienceDimensionOrMetricFilter.optional(),
    dimensionOrMetricFilter: AudienceDimensionOrMetricFilter.optional(),
    eventFilter: z
      .object({
        eventName: z.string(),
        eventParameterFilterExpression: AudienceFilterExpression.optional(),
      })
      .optional(),
  })
);

const AudienceSimpleFilter = z.object({
  scope: AudienceFilterScope,
  filterExpression: AudienceFilterExpression,
});

const AudienceSequenceStep = z.object({
  scope: AudienceFilterScope,
  immediatelyFollows: z.boolean().optional(),
  constraintDuration: z.string().optional(),
  filterExpression: AudienceFilterExpression,
});

const AudienceSequenceFilter = z.object({
  scope: AudienceFilterScope,
  sequenceMaximumDuration: z.string().optional(),
  sequenceSteps: z.array(AudienceSequenceStep),
});

const AudienceFilterClause = z.object({
  clauseType: AudienceClauseType,
  simpleFilter: AudienceSimpleFilter.optional(),
  sequenceFilter: AudienceSequenceFilter.optional(),
});

const AudienceEventTrigger = z.object({
  eventName: z.string(),
  logCondition: LogCondition,
});

const SingleFormSchema = z.object({
  account: z.array(z.string()),
  property: z.string(),
  name: z.string(),
  displayName: z.string().min(3),
  description: z.string().min(10),
  membershipDurationDays: z.number().min(1).max(540),
  adsPersonalizationEnabled: z.boolean(),
  eventTrigger: AudienceEventTrigger.optional(),
  exclusionDurationMode: AudienceExclusionDurationMode,
  filterClauses: z.array(AudienceFilterClause),
});

export const FormCreateAmountSchema = z.object({
  amount: z.number(),
});

export const FormsSchema = z.object({
  forms: z.array(SingleFormSchema),
});

// Export the type inferred from CustomConversionsSchema for type safety
export type Audience = z.infer<typeof FormsSchema>;
