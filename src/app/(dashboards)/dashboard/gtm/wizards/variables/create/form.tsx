'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  FormCreateAmountSchema,
  VariableSchemaType,
  FormsSchema,
} from '@/src/lib/schemas/gtm/variables';
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
import { FeatureResponse, FormCreateGTMProps, Variable } from '@/src/types/types';
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
import { Separator } from '@/src/components/ui/separator';
import { fetchAllVariables, variableTypeArray } from '../../../configurations/@variables/items';
import { CreateVariables, listVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import HttpReferrer from '../components/httpReferrer';
import FirstPartyCookie from '../components/firstPartyCookie';
import { Input } from '@/src/components/ui/input';
import AEV from '../components/aev';
import Constant from '../components/constant';
import CustomJS from '../components/customJS';
import DataLayerVariable from '../components/dlv';
import DOMElement from '../components/dom';
import JavaScriptVariable from '../components/variableJS';
import LookupTableVariable from '../components/lookup';
import URL from '../components/url';
import FormatValue from '../components/formatValue';
import EntityComponent from '../components/entity';
import Vis from '../components/vis';
import GoogleTagConfigSettings from '../components/googleTagConfigSettings';
import GoogleTagEventSettings from '../components/googleTagEventSettings';
import UserProvidedData from '../components/userProvidedData';

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

const formDataDefaults: Variable = {
  accountId: '',
  containerId: '',
  workspaceId: '',
  variableId: '',
  name: '',
  type: 'k',
  decodeCookie: '',
  parameter: [
    { type: 'template', key: 'name', value: '' },
    { type: 'boolean', key: 'decodeCookie', value: 'false' },
  ],
  enablingTriggerId: [],
  disablingTriggerId: [],
};

const FormCreateVariable: React.FC<FormCreateGTMProps> = ({
  tierLimits,
  table = [],
  workspaces,
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const entities = useSelector((state: RootState) => state.gtmEntity.entities);
  const router = useRouter();

  const [cachedVariables, setCachedVariables] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllVariablesData = async () => {
      try {
        const data = await fetchAllVariables();
        setCachedVariables(data);
      } catch (error) {
        console.error('Error fetching all variables:', error);
      }
    };

    fetchAllVariablesData();
  }, []);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMVariables'
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

  const form = useForm<VariableSchemaType>({
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
      form.setValue(`forms.${currentStep - 2}.type`, 'k');
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

  const processForm: SubmitHandler<VariableSchemaType> = async (data) => {
    dispatch(setLoading(true));

    console.log('data', data);

    toast('Creating Variables...', {
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

    console.log('formsWithEntities', formsWithEntities);

    const uniqueVariables = new Set();

    try {
      const res = (await CreateVariables({ forms: formsWithEntities })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Variable ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create variable ${result.name}. Please check your access. Any other variables created were successful.`,
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
            `Unable to create variable(s). You have hit your current limit for this feature.`,
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
            toast.error(`Unable to create variable. ${error}`, {
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

    const isFormValid = await form.trigger(fieldsToValidate);

    if (isFormValid) {
      dispatch(incrementStep());
    } else {
      console.error('Form validation failed');
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

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
                    <FormLabel>How many variable forms do you want to create?</FormLabel>
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
        <div className="flex items-center justify-center">
          {fields.map(
            (field, index) =>
              currentStep === index + 2 && (
                <div
                  key={field.id}
                  className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1"
                >
                  <div className="max-w-full mx-auto">
                    <h1>Variable {index + 1}</h1>
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
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Name of Variable"
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
                                    <FormLabel>Variable Type</FormLabel>
                                    <FormDescription>
                                      This is the variable type you want to create.
                                    </FormDescription>
                                    <FormControl>
                                      <Select
                                        {...form.register(`forms.${currentStep - 2}.type`)}
                                        {...field}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a variable type." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectLabel>Variable Type</SelectLabel>
                                            {variableTypeArray.map((variable) => (
                                              <SelectItem key={variable.type} value={variable.type}>
                                                {variable.name}
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
                                  case 'k':
                                    return (
                                      <FirstPartyCookie formIndex={currentStep - 2} type={''} />
                                    );
                                  case 'aev':
                                    return <AEV formIndex={currentStep - 2} type={''} />;
                                  case 'c':
                                    return <Constant formIndex={currentStep - 2} type={''} />;
                                  case 'jsm':
                                    return <CustomJS formIndex={currentStep - 2} type={''} />;
                                  case 'v':
                                    return (
                                      <DataLayerVariable formIndex={currentStep - 2} type={''} />
                                    );
                                  case 'd':
                                    return <DOMElement formIndex={currentStep - 2} type={''} />;
                                  case 'f':
                                    return <HttpReferrer formIndex={currentStep - 2} type={''} />;
                                  case 'j':
                                    return (
                                      <JavaScriptVariable formIndex={currentStep - 2} type={''} />
                                    );
                                  case 'smm':
                                    return (
                                      <LookupTableVariable
                                        formIndex={currentStep - 2}
                                        type={'smm'}
                                        variables={cachedVariables}
                                      />
                                    );
                                  case 'remm':
                                    return (
                                      <LookupTableVariable
                                        formIndex={currentStep - 2}
                                        type={'remm'}
                                        variables={cachedVariables}
                                      />
                                    );
                                  case 'u':
                                    return <URL formIndex={currentStep - 2} type={''} />;
                                  case 'vis':
                                    return <Vis formIndex={currentStep - 2} type={''} />;
                                  case 'e':
                                    return <div>No configuration required for custom event</div>;
                                  case 'ev':
                                    return (
                                      <div>No configuration required for environment name</div>
                                    );
                                  case 'r':
                                    return <div>No configuration required for random number</div>;
                                  case 'uv':
                                    return <div>No configuration required for undefined value</div>;
                                  case 'awec':
                                    return (
                                      <UserProvidedData
                                        formIndex={currentStep - 2}
                                        type={''}
                                        variables={cachedVariables}
                                      />
                                    );
                                  case 'cid':
                                    return <div>No configuration required for container ID</div>;
                                  case 'dbg':
                                    return <div>No configuration required for debugging</div>;
                                  case 'gtes':
                                    return (
                                      <GoogleTagEventSettings
                                        formIndex={currentStep - 2}
                                        type={''}
                                      />
                                    );
                                  case 'gtcs':
                                    return (
                                      <GoogleTagConfigSettings
                                        formIndex={currentStep - 2}
                                        type={''}
                                      />
                                    );
                                  case 'ctv':
                                    return (
                                      <div>
                                        No configuration required for container version number
                                      </div>
                                    );
                                  default:
                                    return <div>Unknown Variable Type</div>;
                                }
                              })()}

                            {selectedType !== 'ctv' &&
                              selectedType !== 'r' &&
                              selectedType !== 'gtcs' &&
                              selectedType !== 'gtes' && (
                                <FormatValue formIndex={currentStep - 2} />
                              )}

                            <EntityComponent formIndex={currentStep - 2} table={table} />
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

export default FormCreateVariable;
