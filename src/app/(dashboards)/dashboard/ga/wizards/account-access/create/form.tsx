'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/accountAccess';
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
import { AccessBinding, FeatureResponse, FormCreateProps, Role } from '@/src/types/types';
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
import { createGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/accountPermissions';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { DataRestrictions, Roles } from '../../../access-permissions/@accounts/items';
import { Separator } from '@/src/components/ui/separator';
import { Checkbox } from '@/src/components/ui/checkbox';

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

const FormCreateAccountAccess: React.FC<FormCreateProps> = ({ tierLimits, accounts = [] }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4AccountAccess'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formDataDefaults: AccessBinding = {
    name: '',
    roles: [Role.VIEWER],
    account: '',
    user: '',
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
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  // Effect to update count when amount changes
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

    toast('Creating user access for account...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueAccountAccessBindings = new Set(forms.map((form) => form.user));
    for (const form of forms) {
      const identifier = `${form.user}-${form.roles}`;
      if (uniqueAccountAccessBindings.has(identifier)) {
        toast.error(`Duplicate account access found for ${form.user} - ${form.roles}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueAccountAccessBindings.add(identifier);
    }

    try {
      const res = (await createGAAccessBindings({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Account access for user ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });

        router.push('/dashboard/ga/access-permissions');
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create account access for user ${result.name}. Please check your access permissions. Any other conversion events created were successful.`,
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
                `Unable to create account access for user ${result.name}. You have ${result.remaining} more you can create.`,
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
            toast.error(`Unable to create account access for user. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.push('/dashboard/ga/access-permissions');
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
    const fieldsToValidate = [`${currentFormPath}.roles`, `${currentFormPath}.user`];

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
                  <FormLabel>How many properties do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value); // Use field.onChange to update the form value
                      handleAmountChange(value); // Call the modified handler
                    }}
                    value={field.value.toString()} // Ensure the Select reflects the form state
                    defaultValue={count.toString()}
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
              className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1"
            >
              <div className="max-w-full md:max-w-xl mx-auto">
                <h1>User {currentStep - 1}</h1>
                <div className="mt-2 md:mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createConversion-${currentStep - 1}`}
                      className="space-y-6"
                    >
                      {(() => {
                        const currentIndex = currentStep - 2; // Adjust for zero-based index

                        return (
                          <>
                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-auto">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentIndex}.account`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Account</FormLabel>
                                      <FormDescription>
                                        This is the account you want to add a user to.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${currentIndex}.account`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select an account." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Account</SelectLabel>
                                              {accounts.map((account) => (
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
                            </div>

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-auto">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentIndex}.user`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>User Email</FormLabel>
                                      <FormDescription>
                                        This is the email of the user you want to add to the
                                        account.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="User email"
                                          {...form.register(`forms.${currentIndex}.user`)}
                                          {...field}
                                        />
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
                                  name={`forms.${currentIndex}.roles`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-3">
                                      <FormLabel>Standard roles</FormLabel>
                                      <FormControl>
                                        <RadioGroup
                                          {...form.register(`forms.${currentIndex}.roles`)}
                                          onValueChange={field.onChange}
                                        >
                                          {Roles.map((item) => (
                                            <FormItem
                                              key={item.label}
                                              className="flex items-center space-x-3 space-y-0"
                                            >
                                              <FormControl>
                                                <RadioGroupItem value={item.id} />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                {item.label}
                                              </FormLabel>
                                            </FormItem>
                                          ))}
                                        </RadioGroup>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="pt-5 pb-5">
                                  <Separator />
                                </div>

                                <FormField
                                  control={form.control}
                                  name={`forms.${currentIndex}.roles`}
                                  render={() => (
                                    <FormItem>
                                      <div className="mb-4">
                                        <FormLabel className="text-base">
                                          Data restrictions (GA4 properties only)
                                        </FormLabel>
                                        <FormDescription>
                                          Select the data restrictions for the user.
                                        </FormDescription>
                                      </div>
                                      {DataRestrictions.map((item) => (
                                        <FormField
                                          key={item.id}
                                          control={form.control}
                                          name={`forms.${currentIndex}.roles`}
                                          render={({ field }) => {
                                            return (
                                              <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                              >
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value?.includes(item.id as Role)}
                                                    onCheckedChange={(checked) => {
                                                      return checked
                                                        ? field.onChange([
                                                            ...(field.value ?? []),
                                                            item.id as Role,
                                                          ])
                                                        : field.onChange(
                                                            (field.value ?? []).filter(
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

export default FormCreateAccountAccess;
