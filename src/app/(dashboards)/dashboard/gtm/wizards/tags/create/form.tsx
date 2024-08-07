'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { FormCreateAmountSchema, TagType, FormsSchema } from '@/src/lib/schemas/gtm/tags';
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
import { FeatureResponse, FormCreateGTMProps, Tag } from '@/src/types/types';
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
import { Input } from '@/src/components/ui/input';
import EntityComponent from '../components/entity';
import { tagTypeArray } from '../../../configurations/@tags/items';
import ConfigTag from '../components/configTag';
import { CreateTags } from '@/src/lib/fetch/dashboard/actions/gtm/tags';
import FiringTriggerComponent from '../components/firingTrigger';
import EventTag from '../components/eventTag';

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

const formDataDefaults: Tag = {
  accountId: '',
  containerId: '',
  workspaceId: '',
  tagId: '',
  name: '',
  type: 'googtag',
  parameter: [
    {
      type: 'template',
      key: 'tagId',
      value: '',
    },
    {
      type: 'list',
      key: 'configSettingsTable',
      list: [],
      value: '',
    },
  ],
  firingTriggerId: ['2147479553'],
  tagFiringOption: 'oncePerEvent',
  monitoringMetadata: {
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
  path: '',
  firingRuleId: [],
  blockingRuleId: [],
  liveOnly: false,
  priority: {
    type: 'integer',
    value: '0',
    key: '',
  },
  notes: '',
  scheduleStartMs: 0,
  scheduleEndMs: 0,
  fingerprint: '',
  blockingTriggerId: [],
  parentFolderId: '',
  tagManagerUrl: '',
  paused: false,
  monitoringMetadataTagNameKey: '',
};

const FormCreateTag: React.FC<FormCreateGTMProps> = ({ tierLimits, table = [], data }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const entities = useSelector((state: RootState) => state.gtmEntity.entities);
  const router = useRouter();

  const [cachedTags, setCachedTags] = useState<any[]>([]);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMTags'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  const form = useForm<TagType>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const selectedType = useWatch({
    control: form.control,
    name: `forms.${currentStep - 2}.type`,
  });

  useEffect(() => {
    if (!selectedType) {
      form.setValue(`forms.${currentStep - 2}.type`, 'googtag');
    }
  }, [selectedType, form, currentStep]);

  useEffect(() => {
    const amount = parseInt(formCreateAmount.getValues('amount').toString());
    dispatch(setCount(amount));
  }, [formCreateAmount.watch('amount'), dispatch]);

  if (notFoundError) {
    return <NotFoundErrorModal onClose={undefined} />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const addForm = () => {
    append(formDataDefaults as any);
  };

  const handleAmountChange = (selectedAmount) => {
    const amount = parseInt(selectedAmount);
    form.reset({ forms: [] });

    for (let i = 0; i < amount; i++) {
      addForm();
    }

    dispatch(setCount(amount));
  };

  const processForm: SubmitHandler<TagType> = async (data) => {
    dispatch(setLoading(true));

    toast('Creating tags...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const formsWithEntities = data.forms.flatMap(
      (formSet) =>
        entities
          .map((entity) => ({
            ...formSet,
            accountId: entity.accountId,
            containerId: entity.containerId,
            workspaceId: entity.workspaceId,
          }))
          .filter((entity) => entity.accountId && entity.containerId && entity.workspaceId) // Filter out empty entities
    );

    const uniqueTags = new Set<string>();

    // Find dup names and show toast

    try {
      const res = (await CreateTags({ forms: formsWithEntities })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Tag ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create tag ${result.name}. Please check your access. Any other tags created were successful.`,
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
          toast.error(
            `Unable to create tag(s). You have hit your current limit for this feature.`,
            {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            }
          );

          dispatch(setIsLimitReached(true));
        }
        if (res.errors) {
          res.errors.forEach((error) => {
            toast.error(`Unable to create tag. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
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
      toast.error(`An unexpected error occurred. ${error}`, {
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
    if (currentStep === 1) {
      dispatch(incrementStep());
      return;
    }

    const currentFormIndex = currentStep - 2;
    const currentFormPath = `forms.${currentFormIndex}` as const;

    const fieldsToValidate = [`${currentFormPath}.name`, `${currentFormPath}.type`] as const;

    const isFormValid = await form.tag(fieldsToValidate);

    if (isFormValid) {
      dispatch(incrementStep());
    } else {
      console.error('Form validation failed');
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  console.log('forms', form.formState.errors);

  return (
    <div className="overflow-y-auto h-full">
      {currentStep === 1 ? (
        <div className="flex items-center justify-center h-screen overflow-auto">
          <Form {...formCreateAmount}>
            <form className="w-full md:w-2/3 space-y-6">
              <FormField
                control={formCreateAmount.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How many tag forms do you want to create?</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        handleAmountChange(value);
                      }}
                      defaultValue={count.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the amount of key events you want to create." />
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
        </div>
      ) : (
        <div className="items-center justify-center">
          {fields.map(
            (field, index) =>
              currentStep === index + 2 && (
                <div key={field.id} className="max-w-full px-4 py-10 sm:px-6 lg:px-8 lg:py-1">
                  <div className="max-w-full mx-auto">
                    <h1>Tag {index + 1}</h1>
                    <div className="mt-2 md:mt-12">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(processForm)}
                          id={`createVar-${index}`}
                          className="space-y-6"
                        >
                          <>
                            <div>
                              <FormField
                                control={form.control}
                                name={`forms.${currentStep - 2}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Tag Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Name of Tag"
                                        {...form.register(`forms.${currentStep - 2}.name`)}
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
                                name={`forms.${currentStep - 2}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Tag Type</FormLabel>
                                    <FormDescription>
                                      This is the tag type you want to create.
                                    </FormDescription>
                                    <FormControl>
                                      <Select
                                        {...form.register(`forms.${currentStep - 2}.type`)}
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
                                    return <ConfigTag formIndex={currentStep - 2} table={table} />;
                                  case 'gaawe':
                                    return <EventTag formIndex={currentStep - 2} table={table} />;
                                  case 'html':
                                    return null;
                                  case 'gclidw':
                                    return null;
                                  default:
                                    return <div>Unknown Trigger Type</div>;
                                }
                              })()}

                            <FiringTriggerComponent formIndex={currentStep - 2} />

                            <EntityComponent formIndex={currentStep - 2} entityData={data} />
                          </>
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
                    </div>
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
};

export default FormCreateTag;
