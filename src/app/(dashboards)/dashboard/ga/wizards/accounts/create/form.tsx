'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/accounts';
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
import { FeatureResponse, ProvisionAccountTicketRequest, Role } from '@/src/types/types';
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
import { createProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { pollAccountStatus } from '@/src/utils/server';

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
  const [tosAccepted, setTosAccepted] = useState(false);
  const [accountCreationResponse, setAccountCreationResponse] = useState<FeatureResponse | null>(
    null
  );

  console.log('user:', user?.primaryEmailAddress?.emailAddress);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4Accounts'
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
    propertyName: '',
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

  // Adjust handleAmountSubmit or create a new function to handle selection change
  const handleAmountChange = (selectedAmount) => {
    const amount = parseInt(selectedAmount);
    const newForms = Array(amount).fill(formDataDefaults); // Create a new array with the selected amount of forms

    form.reset({ forms: newForms }); // Reset the forms with the new array
    dispatch(setCount(amount)); // Update the count state
  };


  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true));

    console.log('Forms:', forms);

    toast('Creating accounts...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    try {
      const res = (await createAccounts({ forms })) as FeatureResponse;
      setAccountCreationResponse(res);
      console.log('Account creation response:', res);

      if (res.success) {
        const tosUrls = res.results
          .filter((result) => result.success)
          .map((result) => {
            const tosUrl = `https://analytics.google.com/analytics/web/?provisioningSignup=false#/termsofservice/${result.id}`;
            console.log('Account tosUrl:', tosUrl);
            return tosUrl;
          });

        setTosUrls(tosUrls);

        /*         res.results.forEach((result) => {ß
                  console.log('Result:', result);
        
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
                }); */

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
    const currentFormIndex = currentStep - 2;
    const currentFormPath = `forms.${currentFormIndex}`;
    const currentFormData = form.getValues(currentFormPath as `forms.${number}`);

    const fieldsToValidate = [
      `${currentFormPath}.account.displayName`,
      `${currentFormPath}.account.regionCode`,
      `${currentFormPath}.redirectUri`,
    ];

    const isFormValid = await form.trigger(fieldsToValidate as any);
    if (isFormValid) {
      dispatch(incrementStep());
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  console.log('form errors', form.formState.errors);
  console.log('form', form.formState);


  return (
    <div className="flex items-center justify-center h-screen">
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-2/3 space-y-6">
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

                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.propertyName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Property Name</FormLabel>
                            <FormDescription>
                              This is the account name you want to create.
                            </FormDescription>
                            <FormControl>
                              <Input
                                placeholder="Name of the property"
                                {...form.register(`forms.${currentStep - 2}.propertyName`)}
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                  turned off for OptimaFlo and you're logged in with the correct
                                  account.
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action will open a tab per account to acknowledge terms of
                                  service for GA4. Please verify that you have turn off your pop-up
                                  blocker. You must be logged in with the correct Google account to
                                  accept the Terms of Service. This is the same account you're using
                                  to create the account.
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
      {tosUrls.length > 0 && <OpenTabs urls={tosUrls} onTosAccepted={() => setTosAccepted(true)} />}
    </div>
  );
};

export default FormCreateAccount;
