'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/accounts';
import { FormsPropertySchema } from '@/src/lib/schemas/ga/properties';
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
  FeatureResponse,
  GA4PropertyType,
  ProvisionAccountTicketRequest,
  Role,
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
import { Countries } from '../../../accounts/items';
import { createAccounts, listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog';
import { createGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/accountPermissions';
import { useUser } from '@clerk/nextjs';
import OpenTabs from '@/src/components/client/UI/OpenTabs';

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
type FromsProperty = z.infer<typeof FormsPropertySchema>;

const FormCreateAccount /* : React.FC<FormCreateProps> */ = ({ tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const { user } = useUser();
  const [tosUrls, setTosUrls] = useState<string[]>([]); // Add state for TOS URLs

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4Properties'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formDataDefaults: ProvisionAccountTicketRequest = {
    account: {
      regionCode: '',
      displayName: '',
    },
    redirectUri: '',
  };

  const formDataPropertyDefaults: GA4PropertyType = {
    name: '',
    parent: '',
    currencyCode: 'USD',
    displayName: '',
    industryCategory: 'AUTOMOTIVE',
    timeZone: 'America/New_York',
    propertyType: 'PROPERTY_TYPE_ORDINARY',
    retention: 'FOURTEEN_MONTHS',
    resetOnNewActivity: true,
    acknowledgment: true,
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

  const formProperty = useForm<FromsProperty>({
    defaultValues: {
      forms: [formDataPropertyDefaults],
    },
    resolver: zodResolver(FormsPropertySchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const { fields: propertyFields } = useFieldArray({
    control: formProperty.control,
    name: 'forms',
  });

  const addForm = () => {
    append(formDataDefaults);
  };

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

    // Update the stream count in your state management (if necessary)
    dispatch(setCount(amount));
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true));

    const accountData = data.forms;
    const propertyData = formProperty.getValues().forms;

    console.log('accountData:', accountData);
    console.log('propertyData:', propertyData);

    toast('Creating accounts...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    try {
      const res = (await createAccounts({ forms })) as FeatureResponse;

      if (res.success) {
        const tosUrls = res.results
          .filter((result) => result.success)
          .map((result) => {
            const tosUrl = `https://analytics.google.com/analytics/web/?provisioningSignup=false#/termsofservice/${result.id}`;
            return tosUrl;
          });

        setTosUrls(tosUrls);

        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Account ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });

        router.push('/dashboard/ga/accounts');
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create account ${result.name}. Please check your access permissions. Any other account created were successful.`,
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
                `Unable to create account ${result.name}. You have ${result.remaining} more account(s) you can create.`,
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
            toast.error(`Unable to create account. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.push('/dashboard/ga/accounts');
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
      dispatch(setLoading(false));
    }
  };

  const handleNext = async () => {
    const currentFormIndex = currentStep - 2; // Adjusting for the array index and step count
    const currentFormPath = `forms.${currentFormIndex}`;
    const currentFormData = form.getValues(currentFormPath as `forms.${number}`);

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.account.displayName`,
      `${currentFormPath}.account.regionCode`,
      `${currentFormPath}.redirectUri`,
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
    <div className="flex items-center justify-center h-screen">
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many accounts do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleAmountChange(value); // Call the modified handler
                    }}
                    defaultValue={count.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of accounts you want to create." />
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
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>Account {currentStep - 1}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id="createAccount"
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.account.displayName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Account Name</FormLabel>
                            <FormDescription>
                              This is the account name you want to create.
                            </FormDescription>
                            <FormControl>
                              <Input
                                placeholder="Name of the account"
                                {...form.register(`forms.${currentStep - 2}.account.displayName`)}
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.account.regionCode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormDescription>Country of business</FormDescription>
                            <FormControl>
                              <Select
                                {...form.register(`forms.${currentStep - 2}.account.regionCode`)}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select a region." />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Country</SelectLabel>
                                    {Object.entries(Countries).map(([code, name]) => (
                                      <SelectItem key={code} value={code}>
                                        {name}
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
                      {propertyFields.length >= currentStep - 1 && (
                        <FormField
                          control={formProperty.control}
                          name={`forms.${currentStep - 2}.displayName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Name</FormLabel>
                              <FormDescription>
                                This is the name of the property you want to create.
                              </FormDescription>
                              <FormControl>
                                <Input
                                  placeholder="Name of the property"
                                  {...formProperty.register(`forms.${currentStep - 2}.displayName`)}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious}>
                          Previous
                        </Button>

                        {currentStep - 1 < count ? (
                          <Button type="button" onClick={handleNext}>
                            Next
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button>Submit</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Before continuing, please verify that pop-up blockers have been
                                  turned off for OptimaFlo.
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action will open a tab per account to acknowledge terms of
                                  service for GA4. Please verify that you have turn off your pop-up
                                  blocker.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction>
                                  <Button type="submit" form="createAccount">
                                    {loading ? 'Submitting...' : 'Continue'}
                                  </Button>
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
      {tosUrls.length > 0 && <OpenTabs urls={tosUrls} />}
    </div>
  );
};

export default FormCreateAccount;