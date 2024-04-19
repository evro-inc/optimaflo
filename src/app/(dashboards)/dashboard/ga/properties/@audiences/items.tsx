import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/src/components/ui/input';
import { Checkbox } from '@/src/components/ui/checkbox';

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

export const renderFilterInput = (filterType, field, currentFormIndex) => {
  const { register } = useFormContext();

  switch (filterType) {
    case 'stringFilter':
      return (
        <>
          <Select
            {...register(
              `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.stringFilter.matchType`
            )}
            {...field}
            onValueChange={field.onChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXACT">Exact</SelectItem>
              <SelectItem value="BEGINS_WITH">Begins With</SelectItem>
              <SelectItem value="ENDS_WITH">Ends With</SelectItem>
              <SelectItem value="CONTAINS">Contains</SelectItem>
              <SelectItem value="FULL_REGEXP">Full Regexp</SelectItem>
            </SelectContent>
          </Select>
          <Input
            {...register(
              `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.stringFilter.value`
            )}
            {...field}
            onValueChange={field.onChange}
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              {...register(
                `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.stringFilter.caseSensitive`
              )}
              {...field}
              onValueChange={field.onChange}
            />
            <label
              htmlFor="caseSensitive"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Case Sensitive
            </label>
          </div>
        </>
      );
    case 'inListFilter':
      console.log('inListFilter');
      console.log('field', field);

      return (
        <>
          <Input
            {...register(
              `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.inListFilter.values`
            )}
            onValueChange={field.onChange}
            {...field}
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              {...register(
                `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.inListFilter.caseSensitive`
              )}
              {...field}
              onValueChange={field.onChange}
            />
            <label
              htmlFor="caseSensitive"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Case Sensitive
            </label>
          </div>
        </>
      );
    case 'numericFilter':
      console.log('numericFilter');
      console.log('field', field);

      return (
        <>
          <Select
            {...register(
              `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.numericFilter.operation`
            )}
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
            min={0}
            {...register(
              `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.numericFilter.value`
            )}
            {...field}
            onValueChange={field.onChange}
          />
        </>
      );
    case 'betweenFilter':
      console.log('betweenFilter');
      console.log('field', field);
      return (
        <>
          <Input
            type="number"
            min={0}
            {...register(
              `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.betweenFilter.fromValue`
            )}
            {...field}
            placeholder="From Value"
            onValueChange={field.onChange}
          />
          <Input
            type="number"
            min={0}
            {...register(
              `forms.${currentFormIndex}.filterClauses.simpleFilter.filterExpression.dimensionOrMetricFilter.one_filter.betweenFilter.toValue`
            )}
            {...field}
            placeholder="To Value"
            onValueChange={field.onChange}
          />
        </>
      );
    default:
      return null;
  }
};
