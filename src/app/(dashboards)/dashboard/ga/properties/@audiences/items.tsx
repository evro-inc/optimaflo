import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/src/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/src/components/ui/accordion';
import { Button } from '@/src/components/ui/button';
import { ClockIcon, Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/src/components/ui/input';
import { Checkbox } from '@/src/components/ui/checkbox';
import {
  AudienceFilterExpression,
  AudienceType,
  MatchType,
  Operation,
  StringFilter,
} from '@/src/types/types';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';

export const SimpleScope = [
  {
    id: 'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_EVENT',
    label: 'Within Same Event',
  },
  {
    id: 'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_SESSION',
    label: 'Within Same Session',
  },
  {
    id: 'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
    label: 'Across All Sessions',
  },
];

export const SequenceScope = [
  {
    id: 'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_SESSION',
    label: 'Within Same Session',
  },
  {
    id: 'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
    label: 'Across All Sessions',
  },
];

export const ImmediatelyFollows = [
  {
    id: 'true',
    label: 'is directly followed by',
  },
  {
    id: 'false',
    label: 'is not directly followed by',
  },
];

export const filterTypeMapping = {
  // Dimensions
  adSourceName: 'stringFilter',
  sourceMedium: 'stringFilter',
  source: 'stringFilter',
  medium: 'stringFilter',
  campaignName: 'stringFilter',
  campaignId: 'stringFilter',
  keyword: 'stringFilter',
  deviceCategory: 'stringFilter',
  browser: 'stringFilter',
  browserVersion: 'stringFilter',
  operatingSystem: 'stringFilter',
  operatingSystemVersion: 'stringFilter',
  country: 'stringFilter',
  region: 'stringFilter',
  city: 'stringFilter',
  language: 'stringFilter',
  screenName: 'stringFilter',
  appVersion: 'stringFilter',
  appId: 'stringFilter',
  appName: 'stringFilter',
  eventName: 'stringFilter',
  landingPage: 'stringFilter',
  exitPage: 'stringFilter',
  pageTitle: 'stringFilter',
  pagePath: 'stringFilter',
  pageDepth: 'stringFilter',
  contentGroup: 'stringFilter',
  listParameter: 'stringFilter',
  ecommerceAction: 'stringFilter',
  affiliation: 'stringFilter',
  coupon: 'stringFilter',
  creativeSlot: 'stringFilter',
  promoId: 'stringFilter',
  promoName: 'stringFilter',
  customEvent: 'stringFilter',

  date: 'inListFilter',
  sessionStartTime: 'inListFilter',
  sessionEndTime: 'inListFilter',
  eventTime: 'inListFilter',
  userAgeBracket: 'inListFilter',
  userGender: 'inListFilter',
  interestOther: 'inListFilter',
  userRevenueType: 'inListFilter',
  daysSinceLastSession: 'inListFilter',
  productSku: 'inListFilter',
  itemPromotionCreativeName: 'inListFilter',
  itemPromotionId: 'inListFilter',
  itemPromotionName: 'inListFilter',
  promotionType: 'inListFilter',

  sessionCount: 'numericFilter',
  daysSinceFirstSession: 'numericFilter',
  userBrowser: 'numericFilter',
  userDeviceCategory: 'numericFilter',
  userDeviceBrand: 'numericFilter',
  userDeviceModel: 'numericFilter',
  userDeviceOS: 'numericFilter',
  userDeviceOSVersion: 'numericFilter',
  productQuantity: 'numericFilter',
  productRevenue: 'numericFilter',
  productListPosition: 'numericFilter',
  productVariant: 'numericFilter',
  itemQuantity: 'numericFilter',
  itemListPosition: 'numericFilter',
  itemVariant: 'numericFilter',
  transactionId: 'numericFilter',
  transactionAffiliation: 'numericFilter',
  transactionCouponCode: 'numericFilter',
  checkoutOptions: 'numericFilter',
  checkoutStep: 'numericFilter',
  purchaseQuantity: 'numericFilter',
  refundQuantity: 'numericFilter',

  userAgeBracketUpper: 'betweenFilter',
  userAgeBracketLower: 'betweenFilter',
  productPrice: 'betweenFilter',
  itemRevenue: 'betweenFilter',
  itemPrice: 'betweenFilter',
  transactionRevenue: 'betweenFilter',
  transactionShipping: 'betweenFilter',
  transactionTax: 'betweenFilter',
  purchaseRevenue: 'betweenFilter',
  refundAmount: 'betweenFilter',
  shippingAmount: 'betweenFilter',

  // Metrics
  active1DayUsers: 'numericFilter',
  active28DayUsers: 'numericFilter',
  active7DayUsers: 'numericFilter',
  activeUsers: 'numericFilter',
  dauPerMau: 'numericFilter',
  dauPerWau: 'numericFilter',
  firstTimePurchaserConversionRate: 'numericFilter',
  firstTimePurchasers: 'numericFilter',
  firstTimePurchasersPerNewUser: 'numericFilter',
  newUsers: 'numericFilter',
  totalPurchasers: 'numericFilter',
  totalUsers: 'numericFilter',
  userConversionRate: 'numericFilter',
  userEngagementDuration: 'numericFilter',
  wauPerMau: 'numericFilter',

  addToCarts: 'numericFilter',
  checkouts: 'numericFilter',
  ecommercePurchases: 'numericFilter',
  grossItemRevenue: 'numericFilter',
  grossPurchaseRevenue: 'numericFilter',
  itemDiscountAmount: 'numericFilter',
  itemListClickEvents: 'numericFilter',
  itemListClickThroughRate: 'numericFilter',
  itemListViewEvents: 'numericFilter',
  itemPromotionClickThroughRate: 'numericFilter',
  itemRefundAmount: 'numericFilter',
  itemsAddedToCart: 'numericFilter',
  itemsCheckedOut: 'numericFilter',
  itemsClickedInList: 'numericFilter',
  itemsClickedInPromotion: 'numericFilter',
  itemsPurchased: 'numericFilter',
  itemsViewed: 'numericFilter',
  itemsViewedInList: 'numericFilter',
  itemsViewedInPromotion: 'numericFilter',
  itemViewEvents: 'numericFilter',
  promotionClicks: 'numericFilter',
  promotionViews: 'numericFilter',
  transactions: 'numericFilter',
  transactionsPerPurchaser: 'numericFilter',

  adUnitExposure: 'numericFilter',

  advertiserAdClicks: 'numericFilter',
  advertiserAdCost: 'numericFilter',
  advertiserAdCostPerClick: 'numericFilter',
  advertiserAdCostPerConversion: 'numericFilter',
  advertiserAdImpressions: 'numericFilter',
  cartToViewRate: 'numericFilter',
  crashAffectedUsers: 'numericFilter',
  crashFreeUsersRate: 'numericFilter',
  organicGoogleSearchAveragePosition: 'numericFilter',
  organicGoogleSearchClicks: 'numericFilter',
  organicGoogleSearchClickThroughRate: 'numericFilter',
  organicGoogleSearchImpressions: 'numericFilter',
  publisherAdClicks: 'numericFilter',
  publisherAdImpressions: 'numericFilter',
  purchaserConversionRate: 'numericFilter',
  purchaseToViewRate: 'numericFilter',
  returnOnAdSpend: 'numericFilter',
  scrolledUsers: 'numericFilter',
  totalAdRevenue: 'numericFilter',

  averagePurchaseRevenue: 'numericFilter',
  averagePurchaseRevenuePerPayingUser: 'numericFilter',
  averagePurchaseRevenuePerUser: 'numericFilter',
  averageRevenuePerUser: 'numericFilter',
  totalRevenue: 'numericFilter',

  averageSessionDuration: 'numericFilter',
  bounceRate: 'numericFilter',
  engagedSessions: 'numericFilter',
  engagementRate: 'numericFilter',
  sessionConversionRate: 'numericFilter',
  sessions: 'numericFilter',
  sessionsPerUser: 'numericFilter',

  cohortActiveUsers: 'numericFilter',
  cohortTotalUsers: 'numericFilter',

  conversions: 'numericFilter',
  eventCount: 'numericFilter',
  eventCountPerUser: 'numericFilter',
  eventsPerSession: 'numericFilter',
  eventValue: 'numericFilter',

  screenPageViews: 'numericFilter',
  screenPageViewsPerSession: 'numericFilter',
  screenPageViewsPerUser: 'numericFilter',

  // Custom Metrics
  averageCustomEvent: 'numericFilter',
  countCustomEvent: 'numericFilter',
};

export const MatchData = [
  {
    id: 'EXACT',
    label: 'Exact',
  },
  {
    id: 'BEGINS_WITH',
    label: 'Begins With',
  },
  {
    id: 'ENDS_WITH',
    label: 'Ends With',
  },
  {
    id: 'CONTAINS',
    label: 'Contains',
  },
  {
    id: 'FULL_REGEXP',
    label: 'Full Regexp',
  },
];

export const simpleFilterExpression: AudienceFilterExpression = {
  andGroup: {
    filterExpressions: [
      {
        orGroup: {
          filterExpressions: [
            {
              dimensionOrMetricFilter: {
                fieldName: '', // Fill in the actual field name
                atAnyPointInTime: false,
                inAnyNDayPeriod: 0,
                stringFilter: {
                  // Correctly use the union type
                  matchType: MatchType.Exact,
                  value: '', // Provide the actual value to match
                  caseSensitive: false,
                } as StringFilter, // Cast explicitly if needed
              },
            },

            // ... other filters that should be OR'ed within this AND group ...

            /*      {
                   dimensionOrMetricFilter: {
                     fieldName: '',
                     atAnyPointInTime: false,
                     inAnyNDayPeriod: 0,
                     stringFilter: {
                       matchType: MatchType.EXACT,
                       value: '',
                       caseSensitive: false,
                     },
                              inListFilter: {
                                values: [],
                                caseSensitive: false,
                              },
                              numericFilter: {
                                operation: Operation.EQUAL,
                                value: {
                                  int64Value: '0',
                                  doubleValue: 0,
                                },
                              },
                              betweenFilter: {
                                fromValue: {
                                  int64Value: '0',
                                  doubleValue: 0,
                                },
                                toValue: {
                                  int64Value: '0',
                                  doubleValue: 0,
                                },
                              }, 
                   },
                 }, */
            /*    {
                 notExpression: {
                   dimensionOrMetricFilter: {
                     fieldName: '',
                     atAnyPointInTime: false,
                     inAnyNDayPeriod: 0,
                     stringFilter: {
                       matchType: MatchType.EXACT,
                       value: '',
                       caseSensitive: false,
                     },
                     inListFilter: {
                       values: [],
                       caseSensitive: false,
                     },
                     numericFilter: {
                       operation: Operation.EQUAL,
                       value: {
                         int64Value: '0',
                         doubleValue: 0,
                       },
                     },
                     betweenFilter: {
                       fromValue: {
                         int64Value: '0',
                         doubleValue: 0,
                       },
                       toValue: {
                         int64Value: '0',
                         doubleValue: 0,
                       },
                     },
                   },
                 },
               }, */

            /*  {
               orGroup: {
                 filterExpressions: [],
               },
       
       
               eventFilter: {
                 eventName: '',
                 eventParameterFilterExpression: {
                   andGroup: {
                     filterExpressions: [],
                   },
                   orGroup: {
                     filterExpressions: [],
                   },
                   notExpression: {
                     dimensionOrMetricFilter: {
                       fieldName: '',
                       atAnyPointInTime: false,
                       inAnyNDayPeriod: 0,
                       stringFilter: {
                         matchType: MatchType.EXACT,
                         value: '',
                         caseSensitive: false,
                       },
                       inListFilter: {
                         values: [],
                         caseSensitive: false,
                       },
                       numericFilter: {
                         operation: Operation.EQUAL,
                         value: {
                           int64Value: '0',
                           doubleValue: 0,
                         },
                       },
                       betweenFilter: {
                         fromValue: {
                           int64Value: '0',
                           doubleValue: 0,
                         },
                         toValue: {
                           int64Value: '0',
                           doubleValue: 0,
                         },
                       },
                     },
                   },
                   dimensionOrMetricFilter: {
                     fieldName: '',
                     atAnyPointInTime: false,
                     inAnyNDayPeriod: 0,
                     stringFilter: {
                       matchType: MatchType.EXACT,
                       value: '',
                       caseSensitive: false,
                     },
                     inListFilter: {
                       values: [],
                       caseSensitive: false,
                     },
                     numericFilter: {
                       operation: Operation.EQUAL,
                       value: {
                         int64Value: '0',
                         doubleValue: 0,
                       },
                     },
                     betweenFilter: {
                       fromValue: {
                         int64Value: '0',
                         doubleValue: 0,
                       },
                       toValue: {
                         int64Value: '0',
                         doubleValue: 0,
                       },
                     },
                   },
                 },
               },
             }, */
          ],
        },
      },
    ],
  },
};

export const sequenceStepFilterExpression = {
  andGroup: {
    filterExpressions: [],
  },
  orGroup: {
    filterExpressions: [],
  },
  notExpression: {
    dimensionOrMetricFilter: {
      category: '',
      fieldName: '',
      atAnyPointInTime: false,
      inAnyNDayPeriod: 0,
      stringFilter: {
        matchType: MatchType.EXACT,
        value: '',
        caseSensitive: false,
      },
      inListFilter: {
        values: [],
        caseSensitive: false,
      },
      numericFilter: {
        operation: Operation.EQUAL,
        value: {
          int64Value: '0',
          doubleValue: 0,
        },
      },
      betweenFilter: {
        fromValue: {
          int64Value: '0',
          doubleValue: 0,
        },
        toValue: {
          int64Value: '0',
          doubleValue: 0,
        },
      },
    },
  },
  dimensionOrMetricFilter: {
    fieldName: '',
    atAnyPointInTime: false,
    inAnyNDayPeriod: 0,
    stringFilter: {
      matchType: MatchType.EXACT,
      value: '',
      caseSensitive: false,
    },
    inListFilter: {
      values: [],
      caseSensitive: false,
    },
    numericFilter: {
      operation: Operation.EQUAL,
      value: {
        int64Value: '0',
        doubleValue: 0,
      },
    },
    betweenFilter: {
      fromValue: {
        int64Value: '0',
        doubleValue: 0,
      },
      toValue: {
        int64Value: '0',
        doubleValue: 0,
      },
    },
  },
  eventFilter: {
    eventName: '',
    eventParameterFilterExpression: {
      andGroup: {
        filterExpressions: [],
      },
      orGroup: {
        filterExpressions: [],
      },
      notExpression: {
        dimensionOrMetricFilter: {
          fieldName: '',
          atAnyPointInTime: false,
          inAnyNDayPeriod: 0,
          stringFilter: {
            matchType: MatchType.EXACT,
            value: '',
            caseSensitive: false,
          },
          inListFilter: {
            values: [],
            caseSensitive: false,
          },
          numericFilter: {
            operation: Operation.EQUAL,
            value: {
              int64Value: '0',
              doubleValue: 0,
            },
          },
          betweenFilter: {
            fromValue: {
              int64Value: '0',
              doubleValue: 0,
            },
            toValue: {
              int64Value: '0',
              doubleValue: 0,
            },
          },
        },
      },
      dimensionOrMetricFilter: {
        fieldName: '',
        atAnyPointInTime: false,
        inAnyNDayPeriod: 0,
        stringFilter: {
          matchType: MatchType.EXACT,
          value: '',
          caseSensitive: false,
        },
        inListFilter: {
          values: [],
          caseSensitive: false,
        },
        numericFilter: {
          operation: Operation.EQUAL,
          value: {
            int64Value: '0',
            doubleValue: 0,
          },
        },
        betweenFilter: {
          fromValue: {
            int64Value: '0',
            doubleValue: 0,
          },
          toValue: {
            int64Value: '0',
            doubleValue: 0,
          },
        },
      },
    },
  },
};

export const LogConditionData = [
  {
    id: 'AUDIENCE_JOINED',
    label: 'Audience Joined',
    description: 'The event should be logged only when a user is joined.',
  },
  {
    id: 'AUDIENCE_MEMBERSHIP_RENEWED',
    label: 'Audience Membership Renewed',
    description:
      'The event should be logged whenever the Audience condition is met, even if the user is already a member of the Audience.',
  },
];

const renderStringFilter = (fieldBase) => {
  const { control } = useFormContext();
  const matchType = `${fieldBase}.stringFilter.matchType`;
  const stringFilterValue = `${fieldBase}.stringFilter.value`;
  const stringFilterCaseSensitive = `${fieldBase}.stringFilter.caseSensitive`;

  return (
    <>
      <FormField
        control={control}
        name={matchType}
        render={({ field }) => (
          <FormItem>
            <FormLabel>String Condition</FormLabel>
            <FormControl>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                }}
                defaultValue={field.value || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Match Type Condition" />
                </SelectTrigger>
                <SelectContent>
                  {MatchData.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={stringFilterValue}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div>
                <Input {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center space-x-2">
        <FormField
          control={control}
          name={stringFilterCaseSensitive}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div>
                  <Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} />
                  <label
                    htmlFor="caseSensitive"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Case Sensitive
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

const renderInListFilter = (register, field, fieldBase) => (
  <>
    <Input
      {...register(`${fieldBase}.inListFilter.values`)}
      onValueChange={field.onChange}
      {...field}
    />
    <div className="flex items-center space-x-2">
      <Checkbox
        {...register(`${fieldBase}.inListFilter.caseSensitive`)}
        onValueChange={field.onChange}
        {...field}
      />
      <label className="text-sm font-medium">Case Sensitive</label>
    </div>
  </>
);

const renderNumericFilter = (register, field, fieldBase) => (
  <>
    <Select
      {...register(`${fieldBase}.numericFilter.operation`)}
      onValueChange={field.onChange}
      {...field}
    >
      <SelectTrigger>
        <SelectValue placeholder="Condition" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="EQUAL">Equal</SelectItem>
        <SelectItem value="LESS_THAN">Less Than</SelectItem>
        <SelectItem value="LESS_THAN_OR_EQUAL">Less Than or Equal</SelectItem>
        <SelectItem value="GREATER_THAN">Greater Than</SelectItem>
        <SelectItem value="GREATER_THAN_OR_EQUAL">Greater Than or Equal</SelectItem>
      </SelectContent>
    </Select>
    <Input
      type="number"
      {...register(`${fieldBase}.numericFilter.value`)}
      onValueChange={field.onChange}
      {...field}
    />
  </>
);

const renderBetweenFilter = (register, field, fieldBase) => (
  <>
    <Input
      type="number"
      min={0}
      {...register(`${fieldBase}.betweenFilter.fromValue`)}
      {...field}
      placeholder="From Value"
      onValueChange={field.onChange}
    />
    <Input
      type="number"
      min={0}
      {...register(`${fieldBase}.betweenFilter.toValue`)}
      {...field}
      placeholder="To Value"
      onValueChange={field.onChange}
    />
  </>
);

export const renderFilterInput = (filterType, audienceFormIndex, typeFormIndex, cardFormIndex) => {
  const fieldBase = `forms[${audienceFormIndex}].filterClauses[${typeFormIndex}].simpleFilter.filterExpression.andGroup.filterExpressions[${cardFormIndex}].orGroup.filterExpressions[${cardFormIndex}].dimensionOrMetricFilter`;
  const matchType = `${fieldBase}.stringFilter.matchType`;
  const stringFilterValue = `${fieldBase}.stringFilter.value`;

  switch (filterType) {
    case 'stringFilter':
      return renderStringFilter(fieldBase);
    /*     case 'inListFilter':
          return renderInListFilter(register, fields, fieldBase);
        case 'numericFilter':
          return renderNumericFilter(register, fields, fieldBase);
        case 'betweenFilter':
          return renderBetweenFilter(register, fields, fieldBase); */
    default:
      return null;
  }
};

export const TimeConstraint = () => {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="flex justify-between items-center w-full" size="icon" variant="ghost">
            <ClockIcon className="text-gray-400" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl mx-auto bg-white shadow rounded-lg">
          <div className="flex">
            <div className="flex flex-col w-64 mr-4">
              <div className="flex items-center px-3 py-2 space-x-2 border-b">
                <MagnifyingGlassIcon className="text-gray-400" />
                <Input placeholder="Search items" />
              </div>
              <Accordion type="single" className="mt-2">
                <AccordionItem value="events">
                  <AccordionTrigger>Events</AccordionTrigger>
                  <AccordionContent>
                    <ul className="divide-y cursor-pointer">
                      <li className="px-3 py-2">app_clear_data</li>
                      <li className="px-3 py-2">app_exception</li>
                      <li className="px-3 py-2">app_store_refund</li>
                      <li className="px-3 py-2">app_store_subscription_cancel</li>
                      <li className="px-3 py-2">app_store_subscription_convert</li>
                      <li className="px-3 py-2">app_store_subscription_renew</li>
                      <li className="px-3 py-2">app_update</li>
                      <li className="px-3 py-2">first_open</li>
                      <li className="px-3 py-2">in_app_purchase</li>
                      <li className="px-3 py-2">notification_dismiss</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dimensions">
                  <AccordionTrigger>Dimensions</AccordionTrigger>
                  <AccordionContent>
                    <ul className="divide-y cursor-pointer">
                      <li className="px-3 py-2">User</li>
                      <li className="px-3 py-2">Session</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="metrics">
                  <AccordionTrigger>Metrics</AccordionTrigger>
                  <AccordionContent>
                    <ul className="divide-y cursor-pointer">
                      <li className="px-3 py-2">Revenue</li>
                      <li className="px-3 py-2">Engagement</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="flex-1">
              <ScrollArea className="h-72">
                <ul className="divide-y">
                  <li className="px-3 py-2">app_clear_data</li>
                  <li className="px-3 py-2 bg-blue-100">app_exception</li>
                  <li className="px-3 py-2">app_store_refund</li>
                  <li className="px-3 py-2">app_store_subscription_cancel</li>
                  <li className="px-3 py-2">app_store_subscription_convert</li>
                  <li className="px-3 py-2">app_store_subscription_renew</li>
                  <li className="px-3 py-2">app_update</li>
                  <li className="px-3 py-2">first_open</li>
                  <li className="px-3 py-2">in_app_purchase</li>
                  <li className="px-3 py-2">notification_dismiss</li>
                </ul>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
