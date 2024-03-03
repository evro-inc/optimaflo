'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/links';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

import { Input } from '@/src/components/ui/input';
import {
  ConversionCountingMethod,
  FirebaseLink,
  FeatureResponse,
  FormCreateProps,
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
import { createGAFirebaseLinks } from '@/src/lib/fetch/dashboard/actions/ga/links';
import { ConversionCountingItems, Currencies } from '../../../properties/@conversions/items';
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

const FormCreateFBLink: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4FBLinks'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter((property) => property.parent === account.name);

      return {
        ...account,
        properties: accountProperties,
      };
    })
    .filter((account) => account.properties.length > 0);

  const formDataDefaults: FirebaseLink = {
    account: accountsWithProperties[0].name,
    property: table[0].parent,
    project: '',
    name: '',
  };

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
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
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
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
    dispatch(setLoading(true));

    toast('Creating FireBase links...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueFirebaseLinks = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.project}`;
      if (uniqueFirebaseLinks.has(identifier)) {
        toast.error(`Duplicate conversion event found for ${form.property} - ${form.project}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueFirebaseLinks.add(identifier);
    }

    try {
      const res = (await createGAFirebaseLinks({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Firebase link ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });

        router.push('/dashboard/ga/links');
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create firebase link ${result.name}. Please check your access permissions. Any other conversion events created were successful.`,
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
                `Unable to create firebase link ${result.name}. You have ${result.remaining} more conversion event(s) you can create.`,
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
            toast.error(`Unable to create firebase link. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.push('/dashboard/ga/links');
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
      `${currentFormPath}.project`,
      `${currentFormPath}.account`,
      `${currentFormPath}.property`,
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

  return (
    <div className="flex items-center justify-center h-screen overflow-auto">
      {/* Conditional rendering based on the currentStep */}
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-full md:w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many conversion events do you want to create?</FormLabel>
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

      {currentStep > 1 && (
        <div className="w-full">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length >= currentStep - 1 && (
            <div
              key={fields[currentStep - 2].id}
              className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1"
            >
              <div className="max-w-full md:max-w-xl mx-auto">
                <h1>FireBase Links {currentStep - 1}</h1>
                <div className="mt-2 md:mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createFBLink-${currentStep - 1}`}
                      className="space-y-6"
                    >
                      {(() => {
                        const currentIndex = currentStep - 2; // Adjust for zero-based index
                        const selectedAccountId = form.watch(`forms.${currentIndex}.account`);
                        const filteredProperties = properties.filter(
                          (property) => property.parent === selectedAccountId
                        );

                        return (
                          <>
                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.account`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Account</FormLabel>
                                      <FormDescription>
                                        This is the account you want to create the property in.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${currentStep - 2}.account`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select an account." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Account</SelectLabel>
                                              {accountsWithProperties.map((account) => (
                                                <SelectItem key={account.name} value={account.name}>
                                                  {account.displayName}
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
                              <div className="w-full md:basis-1/2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.property`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Property</FormLabel>
                                      <FormDescription>
                                        Which property do you want to create the conversion event
                                        in?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${currentStep - 2}.property`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a property." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Property</SelectLabel>
                                              {filteredProperties.length > 0 ? (
                                                filteredProperties.map((property) => (
                                                  <SelectItem
                                                    key={property.name}
                                                    value={property.name}
                                                  >
                                                    {property.displayName}
                                                  </SelectItem>
                                                ))
                                              ) : (
                                                <SelectItem value="" disabled>
                                                  No properties available
                                                </SelectItem>
                                              )}
                                            </SelectGroup>
                                          </SelectContent>
                                        </Select>
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-auto">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentStep - 2}.project`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>FireBase Project Link to Create</FormLabel>
                                      <FormDescription>Create a FireBase link.</FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Enter the FireBase project link to create"
                                          {...form.register(`forms.${currentStep - 2}.project`)}
                                          {...field}
                                        />
                                      </FormControl>

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

export default FormCreateFBLink;
