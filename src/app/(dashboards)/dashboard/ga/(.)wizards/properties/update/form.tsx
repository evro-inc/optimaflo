'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormsSchema } from '@/src/lib/schemas/ga/properties';
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

import { Input } from '@/src/components/ui/input';
import { FeatureResponse, GA4PropertyType } from '@/src/types/types';
import { toast } from 'sonner';
import { updateProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  CurrencyCodes,
  IndustryCategories,
  TimeZones,
  retentionSettings360,
  retentionSettingsStandard,
} from '../../../properties/@index/propertyItems';
import { Switch } from '@/src/components/ui/switch';

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

const FormUpdateProperty = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index

  const formDataDefaults: GA4PropertyType[] = Object.values(selectedRowData).map((rowData) => ({
    name: rowData.displayName,
    parent: rowData.name,
    currencyCode: rowData.currencyCode,
    displayName: rowData.displayName,
    industryCategory: rowData.industryCategory,
    timeZone: rowData.timeZone,
    propertyType: rowData.propertyType,
    retention: rowData.retention,
    resetOnNewActivity: rowData.resetOnNewActivity,
    acknowledgment: rowData.acknowledgment,
  }));

  const form = useForm<Forms>({
    defaultValues: {
      forms: formDataDefaults,
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  if (notFoundError) {
    return <NotFoundErrorModal onClose={undefined} />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const handleNext = async () => {
    const currentFormIndex = currentStep - 2; // Adjusting for the array index and step count
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.displayName`,
      `${currentFormPath}.parent`,
      `${currentFormPath}.currencyCode`,
      `${currentFormPath}.timeZone`,
      `${currentFormPath}.industryCategory`,
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

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;

    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating properties...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueProperties = new Set(forms.map((form) => form.parent));

    for (const form of forms) {
      const identifier = `${form.parent} - ${form.name} - ${form.displayName}`;
      if (uniqueProperties.has(identifier)) {
        toast.error(`Duplicate property found for ${form.name} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueProperties.add(identifier);
    }

    try {
      const res = (await updateProperties({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Property ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create property ${result.name}. Please check your access permissions. Any other properties created were successful.`,
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
                `Unable to create property ${result.name}. You have ${result.remaining} more feature(s) you can update.`,
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
            toast.error(`Unable to create property. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
        }

        form.reset({
          forms: formDataDefaults,
        });
      }

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: formDataDefaults,
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

  return (
    <div className="flex items-center justify-center h-screen">
      {/* Conditional rendering based on the currentStep */}

      {currentStep && (
        <div className="w-full">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length > 0 && fields.length >= currentStep && (
            <div
              key={fields[currentStep - 1].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-full mx-auto">
                <h1>{fields[currentFormIndex]?.displayName}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`updateProperty-${currentFormIndex}`}
                      className="space-y-6"
                    >
                      {fields.length > 0 &&
                        fields.map((field, index) => {
                          if (index === currentStep - 1) {
                            return (
                              <>
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Property Name</FormLabel>
                                      <FormDescription>
                                        This is the property name you want to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the property"
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

                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.currencyCode`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Currency</FormLabel>
                                      <FormDescription>
                                        Which currency do you want to include in the property?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${currentFormIndex}.currencyCode`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a currency." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Currency</SelectLabel>
                                              {CurrencyCodes.map((code) => (
                                                <SelectItem key={code} value={code}>
                                                  {code}
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

                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.timeZone`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Time Zone</FormLabel>
                                      <FormDescription>
                                        Which timeZone do you want to include in the property?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${currentFormIndex}.timeZone`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a timeZone." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Timezone</SelectLabel>
                                              {TimeZones.map((timeZone) => (
                                                <SelectItem key={timeZone} value={timeZone}>
                                                  {timeZone}
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
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.industryCategory`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Category</FormLabel>
                                      <FormDescription>
                                        Which category do you want to include in the property?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${currentFormIndex}.industryCategory`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a category." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Industry Category</SelectLabel>

                                              {Object.entries(IndustryCategories).map(
                                                ([label, value]) => (
                                                  <SelectItem key={value} value={value}>
                                                    {label}
                                                  </SelectItem>
                                                )
                                              )}
                                            </SelectGroup>
                                          </SelectContent>
                                        </Select>
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.retention`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Retention Setting</FormLabel>
                                      <FormDescription>
                                        Set the retention setting for the property.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${currentFormIndex}.retention`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a retention setting." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Retention Setting</SelectLabel>
                                              {Object.entries(
                                                selectedRowData[currentFormIndex] &&
                                                  selectedRowData[currentFormIndex].serviceLevel ===
                                                    'Standard'
                                                  ? retentionSettingsStandard || {}
                                                  : retentionSettings360 || {}
                                              ).map(([label, value]) => (
                                                <SelectItem key={value} value={value}>
                                                  {label}
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

                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.resetOnNewActivity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="space-y-0.5">
                                        <FormLabel>Reset user data on new activity</FormLabel>
                                        <FormDescription>
                                          If enabled, reset the retention period for the user
                                          identifier with every event from that user.
                                        </FormDescription>
                                      </div>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </>
                            );
                          }
                          return null;
                        })}

                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious} disabled={currentStep === 1}>
                          Previous
                        </Button>

                        {currentStep < fields.length ? (
                          <Button type="button" onClick={handleNext}>
                            Next
                          </Button>
                        ) : (
                          <Button type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
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

export default FormUpdateProperty;
