'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLoading,
  incrementStep,
  decrementStep,
  setCount,
  setShowForm,
  removeForm
} from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AudienceExclusionDurationMode,
  FormCreateAmountSchema,
  FormsSchema
} from '@/src/lib/schemas/ga/audiences';
import { Button } from '@/src/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/src/components/ui/select';

import { Input } from '@/src/components/ui/input';
import {
  AudienceType,
  FeatureResponse,
  FormCreateProps
} from '@/src/types/types';
import { toast } from 'sonner';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createGAAudiences } from '@/src/lib/fetch/dashboard/actions/ga/audiences';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/src/components/ui/card';
import {
  ConversionCountingItems,
  Currencies
} from '../../../properties/@conversions/items';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Scope } from '../../../properties/@audiences/items';
import { cn } from '@/src/utils/utils';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const ErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/Error').then(
      (mod) => mod.ErrorMessage
    ),
  { ssr: false }
);

type Forms = z.infer<typeof FormsSchema>;

const FormCreateConversionEvent: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = []
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const formsToShow = useSelector((state: any) => state.form.showForm); // Define formsToShow using useSelector

  const extractedData = table.map((item) => {
    const propertyId = item.name.split('/')[1];
    const property = item.property;
    const accountId = item.accountId.split('/')[1];
    const accountName = item.accountName;
    const ids = 'accountId/' + accountId + '/' + 'propertyId/' + propertyId;
    const names = 'account/' + accountName + '/' + 'property/' + property;

    return {
      ids,
      names
    };
  });

  const cleanedData = extractedData.map((item) => ({
    id: item.ids,
    label: item.names
      .replace(/\/property\//g, ' - Property: ')
      .replace(/account\//g, '')
      .replace(/\/propertyId\//g, ' - Property ID: ')
      .replace(/accountId\//g, 'Account ID: ')
  }));

  const uniqueData = cleanedData.reduce((acc, current) => {
    const x = acc.find(
      (item) => item.id === current.id && item.label === current.label
    );
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  console.log(uniqueData);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4Audiences'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter(
        (property) => property.parent === account.name
      );

      return {
        ...account,
        properties: accountProperties
      };
    })
    .filter((account) => account.properties.length > 0);

  const formDataDefaults: AudienceType = {
    account: accountsWithProperties[0].name,
    property: accountsWithProperties[0].properties[0].name,
    displayName: '',
    name: '',
    membershipDurationDays: 30,
    adsPersonalizationEnabled: false,
    description: '',
    exclusionDurationMode: AudienceExclusionDurationMode.EXCLUDE_PERMANENTLY,
    filterClauses: []
  };

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1
    }
  });

  // Effect to update count when amount changes
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

  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults]
    },
    resolver: zodResolver(FormsSchema)
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms'
  });
  const addForm = () => {
    append(formDataDefaults);
  };
  const currentFormIndex = currentStep - 2;

  // Adjust handleAmountSubmit or create a new function to handle selection change
  const handleAmountChange = (selectedAmount) => {
    // Convert the selected amount to a number
    const amount = parseInt(selectedAmount);

    // First, reset the current forms to start fresh
    // Note: This step might need adjustment based on your exact requirements
    // and the behavior you observe with your form state management
    form.reset({ forms: [] }); // Clear existing forms

    // Then, append new forms based on the selected amount
    for (let i = 0; i < amount; i++) {
      addForm(); // Use your existing addForm function that calls append
    }

    // Update the conversion event count in your state management (if necessary)
    dispatch(setCount(amount));
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating conversion events...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss()
      }
    });

    const uniqueConversionEvents = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.displayName}`;
      if (uniqueConversionEvents.has(identifier)) {
        toast.error(
          `Duplicate conversion event found for ${form.property} - ${form.displayName}`,
          {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss()
            }
          }
        );
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
              `Custom metric ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss()
                }
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
                `Unable to create conversion event ${result.name}. Please check your access permissions. Any other conversion events created were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss()
                  }
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
                `Unable to create conversion event ${result.name}. You have ${result.remaining} more conversion event(s) you can create.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss()
                  }
                }
              );
            }
          });
          dispatch(setIsLimitReached(true));
        }
        if (res.errors) {
          res.errors.forEach((error) => {
            toast.error(`Unable to create conversion event. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss()
              }
            });
          });
          router.push('/dashboard/ga/properties');
        }
        form.reset({
          forms: [formDataDefaults]
        });
      }

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [formDataDefaults]
      });
    } catch (error) {
      toast.error('An unexpected error occurred.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss()
        }
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
      `${currentFormPath}.filterClauses`
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

  let formCounter = 0; // This could also be stored in Redux if needed

  const handleShowForm = (formType: string) => {
    // Use a more robust ID generation strategy
    // For example, using a timestamp or a globally unique identifier (GUID)
    // This example uses a timestamp for simplicity
    const uniqueId = `${formType}-${new Date().getTime()}`;
    const updatedForms = [...formsToShow, { id: uniqueId, type: formType }];
    dispatch(setShowForm(updatedForms));
  };

  const handleRemoveForm = (formId) => {
    dispatch(removeForm(formId)); // Dispatch action to remove the form
  };

  const Or = (formId: string) => {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Or</CardTitle>
          </CardHeader>
          <CardContent>
            <p>OR</p>
          </CardContent>
        </Card>
        <Button onClick={() => handleRemoveForm(formId)}>Remove</Button>
      </div>
    );
  };

  const And = (formId: string) => {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>And</CardTitle>
          </CardHeader>
          <CardContent>
            <p>AND</p>
          </CardContent>
        </Card>
        <Button onClick={() => handleRemoveForm(formId)}>Remove</Button>
      </div>
    );
  };

  const renderSimpleForm = (formId: string) => {
    return (
      <div>
        <Card>
          <CardHeader>
            <div className="flex flex-row">
              <div className="w-full md:basis-1/3">
                <CardTitle>Include users when:</CardTitle>
              </div>
              <div className="w-full md:basis-1/3">
                <FormField
                  control={form.control}
                  name={`forms.${currentFormIndex}.filterClauses.0.simpleFilter.scope`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          {...form.register(
                            `forms.${currentFormIndex}.filterClauses.0.simpleFilter.scope`
                          )}
                          {...field}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Condition scoping" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Scope</SelectLabel>
                              {Scope.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-full md:basis-1/3">
                <Button onClick={() => handleRemoveForm(formId)}>Remove</Button>
              </div>
            </div>

            <CardDescription>You have 3 unread messages.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-row">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Condition</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name={`forms.${currentFormIndex}.eventName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <FormDescription>
                          This is the event name, dimension, or metric you want
                          to use for your audience.
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="Condition"
                            {...form.register(
                              `forms.${currentFormIndex}.eventName`
                            )}
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button onClick={() => handleShowForm('Or')}>
                    Add condition group to include
                  </Button>
                  <Button onClick={() => handleShowForm('And')}>
                    Add condition group to include
                  </Button>

                  <div className="flex flex-col md:flex-row md:space-x-4">
                    <div className="w-full md:basis-auto">
                      {formsToShow.map((formIdentifier) => {
                        if (formIdentifier.type === 'Or') {
                          return Or(formIdentifier.id);
                        } else if (formIdentifier.type === 'And') {
                          return And(formIdentifier.id);
                        }
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
      </div>
    );
  };

  const renderSequenceForm = () => {
    return (
      <div>
        {/* Define the structure and fields for the "sequence" form */}
        {/* ... */}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      <div className="flex items-center justify-center h-screen mx-auto">
        {currentStep === 1 && (
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
                        handleAmountChange(value); // Call the modified handler
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
        )}
      </div>

      {currentStep > 1 && (
        <div className="w-full flex justify-center mx-auto">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length >= currentStep - 1 && (
            <div
              key={fields[currentFormIndex].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>Audience {currentStep - 1}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createAudience-${currentStep - 1}`}
                      className="space-y-6"
                    >
                      {(() => {
                        return (
                          <>
                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/3">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Audience Name</FormLabel>
                                      <FormDescription>
                                        This is the audience event name you want
                                        to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Audience name"
                                          {...form.register(
                                            `forms.${currentFormIndex}.displayName`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="w-full md:basis-1/3">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormDescription>
                                        This is the description of the audience
                                        event you want to add.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Audience description"
                                          {...form.register(
                                            `forms.${currentFormIndex}.description`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="w-full md:basis-1/3">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.membershipDurationDays`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Membership Duration Days
                                      </FormLabel>
                                      <FormDescription>
                                        Required. Immutable. The duration a user
                                        should stay in an Audience. It cannot be
                                        set to more than 540 days.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Membership Duration Days"
                                          {...form.register(
                                            `forms.${currentFormIndex}.membershipDurationDays`
                                          )}
                                          {...field}
                                          max={540}
                                          min={1}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/2">
                                <Button
                                  onClick={() => handleShowForm('simple')}
                                >
                                  Add condition group to include
                                </Button>
                              </div>
                              <div className="w-full md:basis-1/2">
                                <Button
                                  onClick={() => handleShowForm('sequence')}
                                >
                                  Add sequence to include
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-auto">
                                {formsToShow.map((formIdentifier) => {
                                  if (formIdentifier.type === 'simple') {
                                    return renderSimpleForm(formIdentifier.id);
                                  } else if (
                                    formIdentifier.type === 'sequence'
                                  ) {
                                    return renderSequenceForm(
                                      formIdentifier.id
                                    );
                                  }
                                })}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-auto">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.account`}
                                  render={() => (
                                    <FormItem>
                                      <div className="mb-4">
                                        <FormLabel className="text-base">
                                          Account and Property Selection
                                        </FormLabel>
                                        <FormDescription>
                                          Which account and property do you want
                                          to create the audience for?
                                        </FormDescription>
                                      </div>
                                      {uniqueData.map((item) => (
                                        <FormField
                                          key={item.id}
                                          control={form.control}
                                          name={`forms.${currentFormIndex}.account`}
                                          render={({ field }) => {
                                            return (
                                              <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                              >
                                                <FormControl>
                                                  <Checkbox
                                                    checked={
                                                      Array.isArray(
                                                        field.value
                                                      ) &&
                                                      field.value.includes(
                                                        item.id
                                                      )
                                                    }
                                                    onCheckedChange={(
                                                      checked
                                                    ) => {
                                                      return checked
                                                        ? field.onChange([
                                                            ...(Array.isArray(
                                                              field.value
                                                            )
                                                              ? field.value
                                                              : []),
                                                            item.id
                                                          ])
                                                        : field.onChange(
                                                            (Array.isArray(
                                                              field.value
                                                            )
                                                              ? field.value
                                                              : []
                                                            ).filter(
                                                              (value) =>
                                                                value !==
                                                                item.id
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
                          </>
                        );
                      })()}

                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious}>
                          Previous
                        </Button>

                        {currentStep - 1 < count ? (
                          <Button type="button" onClick={handleNext}>
                            Next
                          </Button>
                        ) : (
                          <Button type="submit">
                            {loading ? 'Submitting...' : 'Submit'}
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>

                  {/* End Form */}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormCreateConversionEvent;
