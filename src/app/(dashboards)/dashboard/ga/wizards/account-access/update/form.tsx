'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormsSchema } from '@/src/lib/schemas/ga/accountAccess';
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
import { FeatureResponse, AccessBinding, Role } from '@/src/types/types';
import { toast } from 'sonner';
import { updateGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/accountPermissions';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { DataRestrictions, Roles } from '../../../access-permissions/@accounts/items';
import { Checkbox } from '@/src/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { Separator } from '@/src/components/ui/separator';

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

const FormUpdateAccountAccess = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1;

  const formDataDefaults: AccessBinding[] = Object.values(selectedRowData).map((rowData) => ({
    user: rowData.user,
    account: rowData.name.split('/')[1],
    roles: rowData.roles,
    name: rowData.name,
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
    // Determine the names of the fields in the current form to validate
    const currentFormFields = [
      `forms.${currentFormIndex}.user`,
      `forms.${currentFormIndex}.account`,
      `forms.${currentFormIndex}.roles`,
    ];

    // Trigger validation for only the current form's fields
    const isFormValid = await form.trigger(currentFormFields as any);

    if (isFormValid) {
      dispatch(incrementStep());
    } else {
      toast.error('A form is invalid. Check all fields in your forms.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;

    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Updating account access...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueAccountAccessBindings = new Set(forms.map((form) => form.user));
    for (const form of forms) {
      const identifier = `${form.user}-${form.account}`;
      if (uniqueAccountAccessBindings.has(identifier)) {
        toast.error(`Duplicate conversion event found for ${form.roles} - ${form.user}`, {
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
      const res = (await updateGAAccessBindings({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Account access ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to udpate account access ${result.name}. Please check your access permissions. Any other conversion events created were successful.`,
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
                `Unable to update account access ${result.name}. You have ${result.remaining} more you can update.`,
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
            toast.error(`Unable to udpate account access. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.push('/dashboard/ga/access-permissions');
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
              <div className="max-w-xl mx-auto">
                <h1>{fields[currentFormIndex]?.user}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`updateAccountAccessBinding-${currentFormIndex}`}
                      className="space-y-6"
                    >
                      {fields.length > 0 &&
                        fields.map((field, index) => {
                          if (index === currentStep - 1) {
                            return (
                              <>
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.roles`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-3">
                                      <FormLabel>Standard roles</FormLabel>
                                      <FormControl>
                                        <RadioGroup
                                          {...form.register(`forms.${currentFormIndex}.roles`)}
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
                                  name={`forms.${currentFormIndex}.roles`}
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
                                          name={`forms.${currentFormIndex}.roles`}
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

export default FormUpdateAccountAccess;
