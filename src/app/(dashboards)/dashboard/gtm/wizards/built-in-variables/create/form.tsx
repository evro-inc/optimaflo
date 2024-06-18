'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/gtm/builtInVariables';
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
  KeyEventType,
  DimensionScope,
  FeatureResponse,
  FormCreateBuiltInVariableProps,
  CountingMethod,
  QueryParameters,
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
import { createGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';
import { Switch } from '@/src/components/ui/switch';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Separator } from '@/src/components/ui/separator';
import { Label } from '@/src/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { BuiltInVariableGroups } from '../../../configurations/@builtInVariables/items';
import {
  CreateBuiltInVariables,
  listGtmBuiltInVariables,
} from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/src/components/ui/carousel';
import { BuiltInVariableType } from '@/src/types/gtm';

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

const FormCreateBuiltInVariable: React.FC<FormCreateBuiltInVariableProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
  containers = [],
  workspaces = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const [createdVariables, setCreatedVariables] = useState<any[]>([]); // State to store created variables
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set()); // State to store selected entities
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    const allTypes = Object.values(BuiltInVariableGroups).flat() as BuiltInVariableType[];
    fields.forEach((_, index) => {
      form.setValue(`forms.${index}.type`, selectAll ? [] : allTypes);
    });
    setSelectAll((prev) => !prev);
  };

  useEffect(() => {
    const fetchCreatedVariables = async () => {
      try {
        const data = await listGtmBuiltInVariables();

        setCreatedVariables(data);
      } catch (error) {
        console.error('Error fetching created variables:', error);
      }
    };

    fetchCreatedVariables();
  }, []);

  const gtmAccountContainerWorkspacesPairs = workspaces.reduce(
    (acc, item) => {
      const account = accounts.find((acc) => acc.accountId === item.accountId);
      const container = containers.find((cont) => cont.containerId === item.containerId);
      const workspace = workspaces.find((ws) => ws.workspaceId === item.workspaceId);

      const identifier = `${account.accountId}-${container.containerId}-${workspace.workspaceId}`;

      if (!acc.seen.has(identifier)) {
        acc.seen.add(identifier);
        acc.result.push({
          account: account.accountId,
          accountName: account.name,
          container: container.containerId,
          containerName: container.name,
          workspace: workspace.workspaceId,
          workspaceName: workspace.name,
        });
      }

      return acc;
    },
    { seen: new Set(), result: [] }
  ).result;

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4KeyEvents'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formDataDefaults: {
    type: BuiltInVariableType[];
    entity: string[];
  } = {
    type: [],
    entity: [],
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

  const includeDefaultValue = form.watch('forms');

  const addForm = () => {
    append(formDataDefaults as any);
  };

  // Adjust handleAmountSubmit or create a new function to handle selection change
  const handleAmountChange = (selectedAmount) => {
    const amount = parseInt(selectedAmount);
    form.reset({ forms: [] });

    for (let i = 0; i < amount; i++) {
      addForm(); // Use your existing addForm function that calls append
    }

    dispatch(setCount(amount));
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true));

    toast('Creating Built-In Variables...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueKeyEvents = new Set<string>();

    for (const form of forms) {
      const identifier = JSON.stringify({ entity: form.entity, type: form.type });

      if (uniqueKeyEvents.has(identifier)) {
        toast.error(`Duplicate key event found for ${form.entity} - ${form.type}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueKeyEvents.add(identifier);
    }

    try {
      const res = (await CreateBuiltInVariables({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Built-in variable ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create built-in variable ${result.name}. Please check your access permissions. Any other built-in variables created were successful.`,
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
            `Unable to built-in variable(s). You have hit your current limit for this feature.`,
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
            toast.error(`Unable to create built-in variable. ${error}`, {
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
    } else {
      const currentFormIndex = currentStep - 2;
      const currentFormPath = `forms.${currentFormIndex}`;

      const fieldsToValidate = [
        `${currentFormPath}.eventName`,
        `${currentFormPath}.countingMethod`,
      ];

      if (includeDefaultValue[currentFormIndex]?.includeDefaultValue) {
        fieldsToValidate.push(
          `${currentFormPath}.defaultValue.numericValue`,
          `${currentFormPath}.defaultValue.currencyCode`
        );
      }

      const isFormValid = await form.trigger(fieldsToValidate as any);

      if (isFormValid) {
        dispatch(incrementStep());
      }
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  const handleEntitySelection = (entity, checked) => {
    const newSelectedEntities = new Set(selectedEntities);
    if (checked) {
      newSelectedEntities.add(JSON.stringify(entity));
    } else {
      newSelectedEntities.delete(JSON.stringify(entity));
    }
    setSelectedEntities(newSelectedEntities);
  };

  const isVariableDisabled = (variable, entity) => {
    return createdVariables.some(
      (createdVar) =>
        createdVar.accountId === entity.account &&
        createdVar.containerId === entity.container &&
        createdVar.workspaceId === entity.workspace &&
        createdVar.type === variable
    );
  };

  return (
    <div className="flex items-center justify-center h-screen overflow-auto">
      {currentStep === 1 ? (
        <Form {...formCreateAmount}>
          <form className="w-full md:w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many key built-in variable forms do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleAmountChange(value); // Call the modified handler
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
      ) : (
        fields.map(
          (field, index) =>
            currentStep === index + 2 && (
              <div>
                {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
                <div
                  key={field.id}
                  className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1"
                >
                  <div className="max-w-full mx-auto">
                    <h1>Built In Variable {index + 1}</h1>
                    <div className="mt-2 md:mt-12">
                      {/* Form */}

                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(processForm)}
                          id={`createVar-${index}`}
                          className="space-y-6"
                        >
                          {(() => {
                            return (
                              <>
                                <div>
                                  <div>
                                    <div className="w-full mx-auto">
                                      <Tabs
                                        defaultValue={
                                          Object.keys(BuiltInVariableGroups).includes('click')
                                            ? 'click'
                                            : Object.keys(BuiltInVariableGroups)[0]
                                        }
                                      >
                                        {/* <Carousel
                                          opts={{
                                            align: "start",
                                          }}
                                          className="w-full max-w-lg"
                                        >
                                          <CarouselContent>
                                            {Array.from({ length: Math.ceil(Object.keys(BuiltInVariableGroups).length) }).map((_, carouselIndex) => (
                                              <CarouselItem key={carouselIndex} className="md:basis-1/2 lg:basis-1/3">
                                                <div className="p-1">
                                                  <TabsList className="flex">
                                                    {Object.keys(BuiltInVariableGroups).slice(carouselIndex, (carouselIndex + 1)).map((groupName) => (
                                                      <TabsTrigger key={groupName} value={groupName}>
                                                        {groupName}
                                                      </TabsTrigger>
                                                    ))}
                                                  </TabsList>
                                                </div>
                                              </CarouselItem>
                                            ))}
                                          </CarouselContent>
                                          <CarouselPrevious type='button' />
                                          <CarouselNext type='button' />
                                        </Carousel> */}

                                        <TabsList className="flex border-b">
                                          {Object.keys(BuiltInVariableGroups).map((groupName) => (
                                            <TabsTrigger
                                              key={groupName}
                                              value={groupName}
                                              className="flex-shrink-0 min-w-[100px]"
                                            >
                                              {groupName}
                                            </TabsTrigger>
                                          ))}
                                        </TabsList>

                                        {Object.entries(BuiltInVariableGroups).map(
                                          ([groupName, variables]) => (
                                            <TabsContent key={groupName} value={groupName}>
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[150px]">
                                                {Array.from({
                                                  length: Math.ceil(variables.length / 5),
                                                }).map((_, colIndex) => (
                                                  <div key={colIndex}>
                                                    {variables
                                                      .slice(colIndex * 5, (colIndex + 1) * 5)
                                                      .map((variable, varIndex) => (
                                                        <FormField
                                                          key={varIndex}
                                                          control={form.control}
                                                          name={`forms.${index}.type`}
                                                          render={({ field, fieldState }) => (
                                                            <FormItem className="flex items-start space-x-3 space-y-0 mb-2">
                                                              <FormControl>
                                                                <Checkbox
                                                                  checked={
                                                                    (Array.isArray(field.value) &&
                                                                      field.value.includes(
                                                                        variable
                                                                      )) ||
                                                                    Array.from(
                                                                      selectedEntities
                                                                    ).some((entityStr) => {
                                                                      const entity =
                                                                        JSON.parse(entityStr);
                                                                      return isVariableDisabled(
                                                                        variable,
                                                                        entity
                                                                      );
                                                                    })
                                                                  }
                                                                  onCheckedChange={(checked) => {
                                                                    if (
                                                                      !Array.from(
                                                                        selectedEntities
                                                                      ).some((entityStr) => {
                                                                        const entity =
                                                                          JSON.parse(entityStr);
                                                                        return isVariableDisabled(
                                                                          variable,
                                                                          entity
                                                                        );
                                                                      })
                                                                    ) {
                                                                      return checked
                                                                        ? field.onChange([
                                                                            ...(Array.isArray(
                                                                              field.value
                                                                            )
                                                                              ? field.value
                                                                              : []),
                                                                            variable,
                                                                          ])
                                                                        : field.onChange(
                                                                            (Array.isArray(
                                                                              field.value
                                                                            )
                                                                              ? field.value
                                                                              : []
                                                                            ).filter(
                                                                              (value) =>
                                                                                value !== variable
                                                                            )
                                                                          );
                                                                    }
                                                                  }}
                                                                  disabled={Array.from(
                                                                    selectedEntities
                                                                  ).some((entityStr) => {
                                                                    const entity =
                                                                      JSON.parse(entityStr);
                                                                    return isVariableDisabled(
                                                                      variable,
                                                                      entity
                                                                    );
                                                                  })}
                                                                />
                                                              </FormControl>
                                                              <FormLabel className="text-sm font-normal">
                                                                {variable}
                                                              </FormLabel>
                                                              {fieldState.error && (
                                                                <FormMessage>
                                                                  {fieldState.error.message}
                                                                </FormMessage>
                                                              )}
                                                            </FormItem>
                                                          )}
                                                        />
                                                      ))}
                                                  </div>
                                                ))}
                                              </div>
                                            </TabsContent>
                                          )
                                        )}
                                      </Tabs>
                                    </div>
                                    <Button type="button" onClick={handleSelectAll}>
                                      {selectAll
                                        ? 'Unselect All Built-In Variables'
                                        : 'Select All Built-In Variables'}
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:space-x-4 py-10">
                                  <div className="w-full md:basis-auto">
                                    <FormField
                                      control={form.control}
                                      name={`forms.${index}.entity`}
                                      render={() => (
                                        <FormItem>
                                          <div className="mb-4">
                                            <FormLabel className="text-base">
                                              Entity Selection
                                            </FormLabel>
                                            <FormDescription>
                                              Which account, container, and workspace do you want to
                                              create the built-in variable(s) for?
                                            </FormDescription>
                                          </div>
                                          {gtmAccountContainerWorkspacesPairs.map((item, idx) => (
                                            <FormField
                                              key={`${item.account}-${item.container}-${item.workspace}`}
                                              control={form.control}
                                              name={`forms.${index}.entity`}
                                              render={({ field }) => {
                                                const compositeValue = `${item.account}-${item.container}-${item.workspace}`;
                                                const entity = {
                                                  account: item.account,
                                                  container: item.container,
                                                  workspace: item.workspace,
                                                };
                                                return (
                                                  <FormItem
                                                    key={compositeValue}
                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                  >
                                                    <FormControl>
                                                      <Checkbox
                                                        checked={
                                                          Array.isArray(field.value) &&
                                                          field.value.includes(compositeValue)
                                                        }
                                                        onCheckedChange={(checked) => {
                                                          handleEntitySelection(entity, checked);
                                                          return checked
                                                            ? field.onChange([
                                                                ...(Array.isArray(field.value)
                                                                  ? field.value
                                                                  : []),
                                                                compositeValue,
                                                              ])
                                                            : field.onChange(
                                                                (Array.isArray(field.value)
                                                                  ? field.value
                                                                  : []
                                                                ).filter(
                                                                  (value) =>
                                                                    value !== compositeValue
                                                                )
                                                              );
                                                        }}
                                                      />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal">
                                                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                        <div>
                                                          <span className="text-gray-600 font-semibold">
                                                            Account:
                                                          </span>
                                                          <span className="ml-2 text-gray-800 font-medium">
                                                            {item.accountName}
                                                          </span>
                                                        </div>
                                                        <Separator orientation="vertical" />
                                                        <div>
                                                          <span className="text-gray-600 font-semibold">
                                                            Container:
                                                          </span>
                                                          <span className="ml-2 text-gray-800 font-medium">
                                                            {item.containerName}
                                                          </span>
                                                        </div>
                                                        <Separator orientation="vertical" />
                                                        <div>
                                                          <span className="text-gray-600 font-semibold">
                                                            Workspace:
                                                          </span>
                                                          <span className="ml-2 text-gray-800 font-medium">
                                                            {item.workspaceName}
                                                          </span>
                                                        </div>
                                                      </div>
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
              </div>
            )
        )
      )}
    </div>
  );
};

export default FormCreateBuiltInVariable;
