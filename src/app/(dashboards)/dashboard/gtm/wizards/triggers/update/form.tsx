'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
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
import { FeatureResponse, Trigger } from '@/src/types/types';
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
import { FormsSchema } from '@/src/lib/schemas/gtm/triggers';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { UpdateTriggers } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';
import LinkClickTrigger from '../components/linkClick';
import VisTrigger from '../components/vis';
import ScrollDepthTrigger from '../components/scroll';
import YouTubeTrigger from '../components/youTube';
import CustomEventTrigger from '../components/customEvent';
import TimerTrigger from '../components/timer';
import TriggerGroup from '../components/triggerGroup';
import FiringOnTrigger from '../components/firesOnTrigger';
import { triggerTypeArray } from '../../../configurations/@triggers/items';

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

const FormUpdateTriggers = ({ data }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index

  if (Object.keys(selectedRowData).length === 0) {
    router.push('/dashboard/gtm/configurations');
  }

  const formDataDefaults: Trigger[] = Object.values(selectedRowData).map((rowData) => ({
    accountId: rowData.accountId,
    containerId: rowData.containerId,
    workspaceId: rowData.workspaceId,
    triggerId: rowData.triggerId,
    name: rowData.name,
    type: rowData.type,
    parameter: rowData.parameter || [],
    formatValue: { caseConversionType: 'none' },
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

  const selectedType = useWatch({
    control: form.control,
    name: `forms.${currentFormIndex}.type`,
  });

  useEffect(() => {
    formDataDefaults.forEach((data, index) => {
      form.setValue(`forms.${index}.accountId`, data.accountId);
      form.setValue(`forms.${index}.containerId`, data.containerId);
      form.setValue(`forms.${index}.workspaceId`, data.workspaceId);
      form.setValue(`forms.${index}.triggerId`, data.triggerId);
    });
  }, [form, formDataDefaults]);

  if (notFoundError) {
    return <NotFoundErrorModal onClose={undefined} />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const handleNext = async () => {
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.accountId`,
      `${currentFormPath}.containerId`,
      `${currentFormPath}.workspaceId`,
      `${currentFormPath}.triggerId`,
    ];

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

    toast('Updating triggers...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueTriggers = new Set<string>();

    for (const form of forms) {
      const identifier = `${form.accountId}-${form.containerId}-${form.workspaceId}-${form.triggerId}`;
      if (uniqueTriggers.has(identifier)) {
        toast.error(`Duplicate trigger found for ${form.name}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueTriggers.add(identifier);
    }

    try {
      const res = (await UpdateTriggers({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Trigger ${result.name} updated successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });

        router.push('/dashboard/gtm/configurations');
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to update version ${result.name}. Please check your access permissions. Any other versions updated were successful.`,
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
                `Unable to update version ${result.name}. You have ${result.remaining} more feature(s) you can update.`,
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
            toast.error(`Unable to update version. ${error}`, {
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
          {fields.length > 0 && fields.length >= currentStep && (
            <div
              key={fields[currentFormIndex].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>{fields[currentFormIndex]?.name}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createVar-${currentFormIndex}`}
                      className="space-y-6"
                    >
                      <div>
                        <FormField
                          control={form.control}
                          name={`forms.${currentFormIndex}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trigger Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Name of Trigger"
                                  {...form.register(`forms.${currentFormIndex}.name`)}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div>
                        <FormField
                          control={form.control}
                          name={`forms.${currentFormIndex}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trigger Type</FormLabel>
                              <FormDescription>
                                This is the trigger type you want to create.
                              </FormDescription>
                              <FormControl>
                                <Select
                                  {...form.register(`forms.${currentFormIndex}.type`)}
                                  {...field}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a trigger type." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectLabel>Trigger Type</SelectLabel>
                                      {triggerTypeArray.map((trigger) => (
                                        <SelectItem key={trigger.type} value={trigger.type}>
                                          {trigger.name}
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
                      {selectedType &&
                        (() => {
                          switch (selectedType) {
                            case 'consentInit':
                              return null;
                            case 'init':
                              return null;
                            case 'pageview':
                              return null;
                            case 'domReady':
                              return null;
                            case 'windowLoaded':
                              return null;
                            case 'click':
                              return null;
                            case 'linkClick':
                              return <LinkClickTrigger formIndex={currentFormIndex} />;
                            case 'elementVisibility':
                              return <VisTrigger formIndex={currentFormIndex} />;
                            case 'formSubmission':
                              return <LinkClickTrigger formIndex={currentFormIndex} />;
                            case 'scrollDepth':
                              return <ScrollDepthTrigger formIndex={currentFormIndex} />;
                            case 'youTubeVideo':
                              return <YouTubeTrigger formIndex={currentFormIndex} />;
                            case 'customEvent':
                              return <CustomEventTrigger formIndex={currentFormIndex} />;
                            case 'historyChange':
                              return null;
                            case 'jsError':
                              return null;
                            case 'timer':
                              return <TimerTrigger formIndex={currentFormIndex} />;
                            case 'triggerGroup':
                              return <TriggerGroup formIndex={currentFormIndex} table={data} />;
                            default:
                              return <div>Unknown Trigger Type</div>;
                          }
                        })()}

                      <FiringOnTrigger formIndex={currentFormIndex} />

                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious}>
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

export default FormUpdateTriggers;
