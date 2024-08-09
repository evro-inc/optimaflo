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
import { FeatureResponse, Tag } from '@/src/types/types';
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
import { FormsSchema } from '@/src/lib/schemas/gtm/tags';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { UpdateTags } from '@/src/lib/fetch/dashboard/actions/gtm/tags';
import { tagTypeArray } from '../../../configurations/@tags/items';
import ConfigTag from '../components/configTag';
import EventTag from '../components/eventTag';
import FiringTriggerComponent from '../components/firingTrigger';

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

const FormUpdateTags = ({ data }) => {
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

  const formDataDefaults: Tag[] = Object.values(selectedRowData).map((rowData) => ({
    accountId: rowData.accountId,
    containerId: rowData.containerId,
    workspaceId: rowData.workspaceId,
    tagId: rowData.tagId || '',
    name: rowData.name || '',
    type: rowData.type || 'googtag',
    parameter: rowData.parameter || [],
    firingTriggerId: rowData.firingTriggerId || ['2147479553'], // Ensure firingTriggerId is included here
    tagFiringOption: rowData.tagFiringOption || 'oncePerEvent',
    monitoringMetadata: rowData.monitoringMetadata || {
      type: 'map',
      key: '',
      value: '',
    },
    consentSettings: {
      consentStatus: 'notSet',
      consentType: {
        type: 'list',
        key: '',
        value: '',
        list: [],
        map: [],
        isWeakReference: false,
      },
    },
    path: rowData.path || '',
    firingRuleId: rowData.firingRuleId || [],
    blockingRuleId: rowData.blockingRuleId || [],
    liveOnly: rowData.liveOnly || false,
    priority: rowData.priority || {
      type: 'integer',
      value: '0',
      key: '',
    },
    notes: rowData.notes || '',
    scheduleStartMs: rowData.scheduleStartMs ? Number(rowData.scheduleStartMs) : 0,
    scheduleEndMs: rowData.scheduleEndMs ? Number(rowData.scheduleEndMs) : 0,
    fingerprint: rowData.fingerprint || '',
    blockingTriggerId: rowData.blockingTriggerId || [],
    parentFolderId: rowData.parentFolderId || '',
    tagManagerUrl: rowData.tagManagerUrl || '',
    paused: rowData.paused || false,
    monitoringMetadataTagNameKey: rowData.monitoringMetadataTagNameKey || '',
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
      form.setValue(`forms.${index}.tagId`, data.tagId);
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
      `${currentFormPath}.tagId`,
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

    toast('Updating tags...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueTags = new Set<string>();

    for (const form of forms) {
      const identifier = `${form.accountId}-${form.containerId}-${form.workspaceId}-${form.tagId}`;
      if (uniqueTags.has(identifier)) {
        toast.error(`Duplicate tag found for ${form.name}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueTags.add(identifier);
    }

    try {
      const res = (await UpdateTags({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Tag ${result.name} updated successfully. The table will update shortly.`,
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
                      <>
                        <div>
                          <FormField
                            control={form.control}
                            name={`forms.${currentFormIndex}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tag Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Name of Tag"
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
                                <FormLabel>Tag Type</FormLabel>
                                <FormDescription>
                                  This is the tag type you want to create.
                                </FormDescription>
                                <FormControl>
                                  <Select
                                    {...form.register(`forms.${currentFormIndex}.type`)}
                                    {...field}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a tag type." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>Tag Type</SelectLabel>
                                        {tagTypeArray.map((trigger) => (
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
                              case 'googtag':
                                return <ConfigTag formIndex={currentFormIndex} table={data} />;
                              case 'gaawe':
                                return <EventTag formIndex={currentFormIndex} table={data} />;
                              case 'html':
                                return null;
                              case 'gclidw':
                                return null;
                              default:
                                return <div>Unknown Trigger Type</div>;
                            }
                          })()}

                        <FiringTriggerComponent formIndex={currentFormIndex} />
                      </>
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

export default FormUpdateTags;
