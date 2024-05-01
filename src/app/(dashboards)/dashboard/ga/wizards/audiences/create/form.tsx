'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/audiences';
import { Button } from '@/src/components/ui/button';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

import { Input } from '@/src/components/ui/input';
import {
  AudienceClauseType,
  AudienceExclusionDurationMode,
  AudienceFilterScope,
  AudienceSimpleFilter,
  AudienceType,
  FeatureResponse,
  FormCreateProps,
  LogCondition,
} from '@/src/types/types';
import { toast } from 'sonner';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createGAAudiences } from '@/src/lib/fetch/dashboard/actions/ga/audiences';
import { Checkbox } from '@/src/components/ui/checkbox';
import {
  LogConditionData,
  sequenceStepFilterExpression,
  simpleFilterExpression,
} from '../../../properties/@audiences/items';
import IncludeConditionalForm from '../components/include/conditionalForm';
import ExcludeConditionalForm from '../components/exclude/conditionalForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const ErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/Error').then((mod) => mod.ErrorMessage),
  { ssr: false }
);

type Forms = z.infer<typeof FormsSchema>;

const FormCreateAudience: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
  dimensions = [],
  metrics = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  // Dimensions
  const categorizedDimensions = dimensions.reduce((acc, item) => {
    const categoryIndex = acc.findIndex((cat) => cat.name === item.category);
    if (categoryIndex > -1) {
      const isUnique = !acc[categoryIndex].items.some(
        (existingItem) => existingItem.apiName === item.apiName
      );
      if (isUnique) {
        acc[categoryIndex].items.push(item);
      }
    } else {
      acc.push({ name: item.category, items: [item] });
    }
    return acc;
  }, []);

  // Metrics
  const categorizedMetrics = metrics.reduce((acc, item) => {
    const categoryIndex = acc.findIndex((cat) => cat.name === item.category);
    if (categoryIndex > -1) {
      const isUnique = !acc[categoryIndex].items.some(
        (existingItem) => existingItem.apiName === item.apiName
      );
      if (isUnique) {
        acc[categoryIndex].items.push(item);
      }
    } else {
      acc.push({ name: item.category, items: [item] });
    }
    return acc;
  }, []);

  // Combined Categories including dimensions and metrics
  const combinedCategories = [
    {
      name: 'Dimensions',
      categories: categorizedDimensions,
    },
    {
      name: 'Metrics',
      categories: categorizedMetrics,
    },
  ];

  // Extract data from table
  const extractedData = table.map((item) => {
    const propertyId = item.name.split('/')[1];
    const property = item.property;
    const accountId = item.accountId.split('/')[1];
    const accountName = item.accountName;
    const ids = 'accountId/' + accountId + '/' + 'propertyId/' + propertyId;
    const names = 'account/' + accountName + '/' + 'property/' + property;

    return {
      ids,
      names,
    };
  });

  // Clean
  const cleanedData = extractedData.map((item) => ({
    id: item.ids,
    label: item.names
      .replace(/\/property\//g, ' - Property: ')
      .replace(/account\//g, '')
      .replace(/\/propertyId\//g, ' - Property ID: ')
      .replace(/accountId\//g, 'Account ID: '),
  }));

  // Remove duplicates
  const uniqueData = cleanedData.reduce((acc, current) => {
    const x = acc.find((item) => item.id === current.id && item.label === current.label);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4Audiences'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  // Filter out accounts with no properties
  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter((property) => property.parent === account.name);

      return {
        ...account,
        properties: accountProperties,
      };
    })
    .filter((account) => account.properties.length > 0);

  //////////////////////////////////////////////////////////////////////
  // Form data defaults
  /////////////////////////////////////////////////////////////////////
  const formDataDefaults: AudienceType = {
    account: accountsWithProperties[0].name,
    property: accountsWithProperties[0].properties[0].name,
    name: '',
    displayName: '',
    description: '',
    membershipDurationDays: 1,
    adsPersonalizationEnabled: false,
    eventTrigger: {
      eventName: '',
      logCondition: LogCondition.AudienceJoined,
    },
    exclusionDurationMode: AudienceExclusionDurationMode.ExcludePermanently,
    filterClauses: [
      {
        clauseType: AudienceClauseType.Include,
        simpleFilter: {
          scope: AudienceFilterScope.AcrossAllSessions,
          filterExpression: simpleFilterExpression,
        } as AudienceSimpleFilter,
        /*  sequenceFilter: {
           scope: AudienceFilterScope.WITHIN_SAME_EVENT,
           sequenceMaximumDuration: '',
           sequenceSteps: [
             {
               scope: AudienceFilterScope.WITHIN_SAME_EVENT,
               immediatelyFollows: false,
               constraintDuration: '',
               filterExpression: sequenceStepFilterExpression,
             },
           ],
         }, */
      },
    ],
  };

  //////////////////////////////////////////////////////////////////////
  // Form state for amount
  /////////////////////////////////////////////////////////////////////
  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  //////////////////////////////////////////////////////////////////////
  // Form state for form data with array
  /////////////////////////////////////////////////////////////////////
  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormsSchema),
  });

  //////////////////////////////////////////////////////////////////////
  // Form state for field array
  /////////////////////////////////////////////////////////////////////
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  //////////////////////////////////////////////////////////////////////
  // Form state for step field array
  /////////////////////////////////////////////////////////////////////
  useEffect(() => {
    const amount = parseInt(formCreateAmount.getValues('amount').toString());
    dispatch(setCount(amount));
  }, [formCreateAmount.watch('amount'), dispatch]);

  if (notFoundError) {
    return <NotFoundErrorModal />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const addForm = () => {
    append(formDataDefaults);
  };

  const removeForm = (index) => {
    remove(index);
  };

  const currentFormIndex = currentStep - 2;

  // Handle amount change
  const handleAmountChange = (selectedAmount) => {
    const amount = parseInt(selectedAmount);

    form.reset({ forms: [] }); // Clear existing forms

    for (let i = 0; i < amount; i++) {
      addForm(); // Use your existing addForm function that calls append
    }

    dispatch(setCount(amount));
  };

  // Handle form submission
  const processForm: SubmitHandler<Forms> = async (data) => {
    console.log('data process', data);

    console.log('Form errors:', form.formState.errors);

    const { forms } = data;
    dispatch(setLoading(true));

    toast('Creating audience...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueConversionEvents = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.displayName}`;
      if (uniqueConversionEvents.has(identifier)) {
        toast.error(`Duplicate conversion event found for ${form.property} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueConversionEvents.add(identifier);
    }

    try {
      const res = (await createGAAudiences({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Audience ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });

        router.push('/dashboard/ga/properties');
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create audience ${result.name}. Please check your access permissions. Any other audiences created were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });

          dispatch(setErrorDetails(res.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
        }

        if (res.limitReached) {
          res.results.forEach((result) => {
            if (result.limitReached) {
              toast.error(
                `Unable to create audience${result.name}. You have ${result.remaining} more audience(s) you can create.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });
          dispatch(setIsLimitReached(true));
        }
        if (res.errors) {
          res.errors.forEach((error) => {
            toast.error(`Unable to create audience. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.refresh();
        }
        form.reset({
          forms: [formDataDefaults],
        });
      }

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [formDataDefaults],
      });
    } catch (error) {
      toast.error('An unexpected error occurred.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
      return { success: false };
    } finally {
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleNext = async () => {
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.account`,
      `${currentFormPath}.property`,
      `${currentFormPath}.displayName`,
      `${currentFormPath}.membershipDurationDays`,
      `${currentFormPath}.adsPersonalizationEnabled`,
      `${currentFormPath}.description`,
      `${currentFormPath}.exclusionDurationMode`,
      `${currentFormPath}.filterClauses`,
    ];

    // Now, trigger validation for these fields
    const isFormValid = await form.trigger(fieldsToValidate as any);

    if (isFormValid) {
      dispatch(incrementStep());
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  /*   console.log('form.formState', form.formState);
  
  
    console.log('form.formState.errors', form.formState.errors); */

  return (
    <div className="flex h-full">
      <div className="flex items-center justify-center h-screen mx-auto">
        {currentStep === 1 && (
          <div className="flex items-center justify-center h-screen mx-auto">
            <Form {...formCreateAmount}>
              <form className="w-full space-y-6">
                {/* Amount selection logic */}
                <FormField
                  control={formCreateAmount.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How many users do you want to add?</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleAmountChange(value);
                        }}
                        defaultValue={count.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the amount of conversion events you want to create." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: remainingCreate }, (_, i) => (
                            <SelectItem key={i} value={`${i + 1}`}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>

      {fields.map((item, index) => {
        return (
          <React.Fragment key={item.id}>
            {currentStep > 1 && index === currentStep - 2 && (
              <div className="w-full flex justify-center mx-auto">
                {fields.length >= currentStep - 1 && (
                  <div key={item.id} className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                    <div className="mx-auto">
                      <h1>Audience {index + 1}</h1>
                      <div className="mt-12">
                        {/* Form */}

                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(processForm)}
                            id={`createAudience-${index - 1}`}
                            className="space-y-6"
                          >
                            <>
                              <div className="flex flex-row space-x-4">
                                <div className="flex-auto w-9/12">
                                  <div className="pb-3">
                                    <FormField
                                      control={form.control}
                                      name={`forms.${index}.displayName`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Audience Name</FormLabel>
                                          <FormDescription>
                                            This is the audience event name you want to create.
                                          </FormDescription>
                                          <FormControl>
                                            <Input
                                              placeholder="Audience name"
                                              {...form.register(`forms.${index}.displayName`, {
                                                required: 'Audience name is required',
                                              })}
                                              {...field}
                                            />
                                          </FormControl>

                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="py-3">
                                    <FormField
                                      control={form.control}
                                      name={`forms.${index}.description`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Description</FormLabel>
                                          <FormDescription>
                                            This is the description of the audience event you want
                                            to add.
                                          </FormDescription>
                                          <FormControl>
                                            <Input
                                              placeholder="Audience description"
                                              {...form.register(`forms.${index}.description`)}
                                              {...field}
                                            />
                                          </FormControl>

                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="py-3">
                                    <IncludeConditionalForm
                                      combinedCategories={combinedCategories}
                                      audienceFormIndex={index}
                                      {...{
                                        control: form.control,
                                        register: form.register,
                                        watch: form.watch,
                                        setValue: form.setValue,
                                      }}
                                    />
                                  </div>

                                  <div className="py-3">
                                    <ExcludeConditionalForm
                                      combinedCategories={combinedCategories}
                                      audienceFormIndex={index}
                                      {...{
                                        control: form.control,
                                        register: form.register,
                                        watch: form.watch,
                                        setValue: form.setValue,
                                      }}
                                    />
                                  </div>

                                  <div className="flex flex-col md:flex-row md:space-x-4 py-10">
                                    <div className="w-full md:basis-auto">
                                      <FormField
                                        control={form.control}
                                        name={`forms.${index}.account`}
                                        render={() => (
                                          <FormItem>
                                            <div className="mb-4">
                                              <FormLabel className="text-base">
                                                Account and Property Selection
                                              </FormLabel>
                                              <FormDescription>
                                                Which account and property do you want to create the
                                                audience for?
                                              </FormDescription>
                                            </div>
                                            {uniqueData.map((item) => (
                                              <FormField
                                                key={item.id}
                                                control={form.control}
                                                name={`forms.${index}.account`}
                                                render={({ field }) => {
                                                  return (
                                                    <FormItem
                                                      key={item.id}
                                                      className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                      <FormControl>
                                                        <Checkbox
                                                          checked={
                                                            Array.isArray(field.value) &&
                                                            field.value.includes(item.id)
                                                          }
                                                          onCheckedChange={(checked) => {
                                                            return checked
                                                              ? field.onChange([
                                                                  ...(Array.isArray(field.value)
                                                                    ? field.value
                                                                    : []),
                                                                  item.id,
                                                                ])
                                                              : field.onChange(
                                                                  (Array.isArray(field.value)
                                                                    ? field.value
                                                                    : []
                                                                  ).filter(
                                                                    (value) => value !== item.id
                                                                  )
                                                                );
                                                          }}
                                                        />
                                                      </FormControl>
                                                      <FormLabel className="text-sm font-normal">
                                                        {item.label}
                                                      </FormLabel>
                                                    </FormItem>
                                                  );
                                                }}
                                              />
                                            ))}
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-start pt-10 space-x-4">
                                    {count <= 2 && (
                                      <Button type="button" onClick={handlePrevious}>
                                        Previous
                                      </Button>
                                    )}

                                    {index < count - 1 ? (
                                      <Button type="button" onClick={handleNext}>
                                        Next
                                      </Button>
                                    ) : (
                                      <Button type="submit">
                                        {loading ? 'Submitting...' : 'Submit'}
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-auto w-3/12">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Additional audience settings</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <FormField
                                        control={form.control}
                                        name={`forms.${index}.membershipDurationDays`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Membership Duration Days</FormLabel>
                                            <FormDescription>
                                              Required. Immutable. The duration a user should stay
                                              in an Audience. It cannot be set to more than 540
                                              days.
                                            </FormDescription>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                placeholder="Membership Duration Days"
                                                {...form.register(
                                                  `forms.${index}.membershipDurationDays`,
                                                  {
                                                    valueAsNumber: true,
                                                  }
                                                )}
                                                {...field}
                                                max={540}
                                                min={1}
                                                onChange={(e) => {
                                                  const value = e.target.valueAsNumber;
                                                  form.setValue(
                                                    `forms.${index}.membershipDurationDays`,
                                                    value
                                                  );
                                                }}
                                              />
                                            </FormControl>

                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={`forms.${index}.eventTrigger.eventName`}
                                        render={({ field }) => (
                                          <FormItem className="py-5">
                                            <FormLabel>Audience Trigger</FormLabel>
                                            <FormDescription>
                                              Specifies an event to log when a user joins the
                                              Audience.
                                            </FormDescription>
                                            <FormControl>
                                              <Input
                                                type="string"
                                                placeholder="Event Name"
                                                {...form.register(
                                                  `forms.${index}.eventTrigger.eventName`
                                                )}
                                                {...field}
                                              />
                                            </FormControl>

                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={form.control}
                                        name={`forms.${index}.eventTrigger.logCondition`}
                                        render={({ field }) => (
                                          <FormItem className="space-y-3">
                                            <FormLabel>
                                              Log the following event when a user becomes a member
                                              of this audience
                                            </FormLabel>
                                            <FormControl>
                                              <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                              >
                                                {LogConditionData.map((item) => (
                                                  <FormItem
                                                    key={item.id}
                                                    className="flex items-center space-x-3 space-y-0"
                                                  >
                                                    <FormControl>
                                                      <RadioGroupItem
                                                        value={item.id}
                                                        checked={field.value === item.id}
                                                      />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                      {item.label}
                                                      <FormDescription>
                                                        {item.description}
                                                      </FormDescription>
                                                    </FormLabel>
                                                  </FormItem>
                                                ))}
                                              </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </>
                          </form>
                        </Form>

                        {/* End Form */}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FormCreateAudience;
