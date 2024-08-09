'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormSchema } from '@/src/lib/schemas/gtm/containers';
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
import { FeatureResponse, FormCreateProps, ContainerType } from '@/src/types/types';
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
import { CreateContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';

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

type Forms = z.infer<typeof FormSchema>;

const FormCreateContainer: React.FC<FormCreateProps> = ({ tierLimits, accounts = [] }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const propertyCount = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const count = useSelector((state: RootState) => state.form.count);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMContainer'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formDataDefaults: ContainerType = {
    accountId: '',
    usageContext: [''],
    name: '',
    domainName: '',
    notes: '',
    containerId: '',
    publicId: '',
    accountName: '',
  };

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormSchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });
  const addForm = () => {
    append(formDataDefaults);
  };

  // Effect to update propertyCount when amount changes
  useEffect(() => {
    const amountValue = formCreateAmount.watch('amount'); // Extract the watched value
    const amount = parseInt(amountValue?.toString() || '0'); // Handle cases where amountValue might be undefined or null
    dispatch(setCount(amount));
  }, [formCreateAmount, dispatch]); // Include formCreateAmount and dispatch as dependencies

  if (notFoundError) {
    return <NotFoundErrorModal onClose={undefined} />;
  }
  if (error) {
    return <ErrorModal />;
  }

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

    // Update the container count in your state management (if necessary)
    dispatch(setCount(amount));
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating containers...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueContainers = new Set(forms.map((form) => form.containerId));

    for (const form of forms) {
      const identifier = `${form.accountId}-${form.containerId}-${form.name}`;

      if (uniqueContainers.has(identifier)) {
        toast.error(`Duplicate property found for ${form.accountId} - ${form.name}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueContainers.add(identifier);
    }

    try {
      const res = (await CreateContainers({ forms })) as FeatureResponse;

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

        router.push('/dashboard/gtm/containers');
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create container ${result.name}. Please check your access permissions. Any other properties created were successful.`,
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
                `Unable to create container ${result.name}. You have ${result.remaining} more container(s) you can create.`,
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
            toast.error(`Unable to create container. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.push('/dashboard/gtm/containers');
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
    const currentFormIndex = currentStep - 2; // Adjusting for the array index and step count
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.name`,
      `${currentFormPath}.accountId`,
      `${currentFormPath}.usageContext`,
      `${currentFormPath}.domainName`,
      `${currentFormPath}.notes`,
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
      {/* Conditional rendering based on the currentStep */}
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={() => (
                <FormItem>
                  <FormLabel>How many properties do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleAmountChange(value); // Call the modified handler
                    }}
                    defaultValue={propertyCount.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of properties you want to create." />
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
                <h1>Property {currentStep - 1}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id="createContainer"
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Container Name</FormLabel>
                            <FormDescription>
                              This is the container name you want to create.
                            </FormDescription>
                            <FormControl>
                              <Input
                                placeholder="Name of the container"
                                {...form.register(`forms.${currentStep - 2}.name`)}
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.accountId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account</FormLabel>
                            <FormDescription>
                              This is the account you want to create the container in.
                            </FormDescription>
                            <FormControl>
                              <Select
                                {...form.register(`forms.${currentStep - 2}.accountId`)}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select an account." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Account</SelectLabel>
                                    {Array.isArray(accounts) &&
                                      accounts.map((account: any) => (
                                        <SelectItem
                                          key={account.accountId}
                                          value={account.accountId}
                                        >
                                          {account.name}
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
                        name={`forms.${currentStep - 2}.usageContext`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usage Context</FormLabel>
                            <FormDescription>
                              Add a usage context for the container.
                            </FormDescription>
                            <FormControl>
                              <Select
                                {...form.register(`forms.${currentStep - 2}.usageContext`)}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select an account." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Account</SelectLabel>
                                    <SelectItem value="web">Web</SelectItem>
                                    <SelectItem value="androidSdk5">Android</SelectItem>
                                    <SelectItem value="iosSdk5">IOS</SelectItem>
                                    <SelectItem value="server">Server</SelectItem>
                                    <SelectItem value="amp">Amp</SelectItem>
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
                        name={`forms.${currentStep - 2}.domainName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain Name: Optional (Must be comma separated)</FormLabel>
                            <FormDescription>
                              This is the domain name you want to add.
                            </FormDescription>
                            <FormControl>
                              <Input
                                placeholder="Enter domain names separated by commas"
                                {...form.register(`forms.${currentStep - 2}.domainName`)}
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes: Optional</FormLabel>
                            <FormDescription>
                              This is the domain name you want to add.
                            </FormDescription>
                            <FormControl>
                              <Input
                                placeholder="Enter any notes you want"
                                {...form.register(`forms.${currentStep - 2}.notes`)}
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

export default FormCreateContainer;
