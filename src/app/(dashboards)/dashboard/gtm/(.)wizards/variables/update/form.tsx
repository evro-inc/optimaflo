'use client';

import React, { useEffect, useState } from 'react';
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
import { FeatureResponse, GTMContainerVersion, Variable } from '@/src/types/types';
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
import { UpdateVersions } from '@/src/lib/fetch/dashboard/actions/gtm/versions';
import { FormsSchema } from '@/src/lib/schemas/gtm/variables';
import HttpReferrer from '../components/httpReferrer';
import FirstPartyCookie from '../components/firstPartyCookie';
import AEV from '../components/aev';
import Constant from '../components/constant';
import CustomJS from '../components/customJS';
import DataLayerVariable from '../components/dlv';
import DOMElement from '../components/dom';
import JavaScriptVariable from '../components/variableJS';
import LookupTableVariable from '../components/lookup';
import URL from '../components/url';
import FormatValue from '../components/formatValue';
import Vis from '../components/vis';
import GoogleTagConfigSettings from '../components/googleTagConfigSettings';
import GoogleTagEventSettings from '../components/googleTagEventSettings';
import UserProvidedData from '../components/userProvidedData';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { fetchAllVariables, variableTypeArray } from '../../../configurations/@variables/items';
import { UpdateVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';

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

const FormUpdateVariables = (data) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index
  const [cachedVariables, setCachedVariables] = useState<any[]>([]); // State to store fetched variables

  if (Object.keys(selectedRowData).length === 0) {
    router.push('/dashboard/gtm/configurations');
  }

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

  const tableData = Array.isArray(selectedRowData) ? selectedRowData : [selectedRowData];

  const formDataDefaults: Variable[] = Object.values(selectedRowData).map((rowData) => ({
    accountId: rowData.accountId,
    containerId: rowData.containerId,
    workspaceId: rowData.workspaceId,
    variableId: rowData.variableId,
    name: rowData.name,
    type: rowData.type,
    parameter: rowData.parameter || [],
    formatValue: { caseConversionType: 'none' },
  }));

  if (notFoundError) {
    return <NotFoundErrorModal onClose={undefined} />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const form = useForm<Forms>({
    defaultValues: {
      forms: formDataDefaults,
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append } = useFieldArray({
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
      form.setValue(`forms.${index}.variableId`, data.variableId);
    });
  }, [form, formDataDefaults]);

  const handleNext = async () => {
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.accountId`,
      `${currentFormPath}.containerId`,
      `${currentFormPath}.workspaceId`,
      `${currentFormPath}.variableId`,
      `${currentFormPath}.name`,
      `${currentFormPath}.description`,
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

    toast('Updating variables...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueVersions = new Set<string>();

    for (const form of forms) {
      const identifier = `${form.accountId}-${form.containerId}-${form.workspaceId}-${form.variableId}`;
      if (uniqueVersions.has(identifier)) {
        toast.error(`Duplicate variable found for ${form.name}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueVersions.add(identifier);
    }

    try {
      const res = (await UpdateVariables({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Workspace ${result.name} updated successfully. The table will update shortly.`,
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
                      {(() => {
                        return (
                          <>
                            <div>
                              <FormField
                                control={form.control}
                                name={`forms.${currentFormIndex}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Variable Name: {fields[currentFormIndex]?.name}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={fields[currentFormIndex]?.name}
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
                                    <FormLabel>Variable Type</FormLabel>
                                    <FormDescription>
                                      This is the variable type you want to create.
                                    </FormDescription>
                                    <FormControl>
                                      <Select
                                        {...form.register(`forms.${currentFormIndex}.type`)}
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

                            {/* Insert the switch statement below */}
                            {selectedType &&
                              (() => {
                                switch (selectedType) {
                                  case 'k':
                                    return (
                                      <FirstPartyCookie formIndex={currentFormIndex} type={''} />
                                    );
                                  case 'aev':
                                    return <AEV formIndex={currentFormIndex} type={''} />;
                                  case 'c':
                                    return <Constant formIndex={currentFormIndex} type={''} />;
                                  case 'jsm':
                                    return <CustomJS formIndex={currentFormIndex} type={''} />;
                                  case 'v':
                                    return (
                                      <DataLayerVariable formIndex={currentFormIndex} type={''} />
                                    );
                                  case 'd':
                                    return <DOMElement formIndex={currentFormIndex} type={''} />;
                                  case 'f':
                                    return (
                                      <HttpReferrer
                                        formIndex={currentFormIndex}
                                        variables={cachedVariables}
                                      />
                                    );
                                  case 'j':
                                    return (
                                      <JavaScriptVariable formIndex={currentFormIndex} type={''} />
                                    );
                                  case 'smm':
                                    return (
                                      <LookupTableVariable
                                        formIndex={currentFormIndex}
                                        variables={cachedVariables}
                                        selectedRows={selectedRowData}
                                      />
                                    );
                                  case 'remm':
                                    return (
                                      <LookupTableVariable
                                        formIndex={currentFormIndex}
                                        variables={cachedVariables}
                                        selectedRows={selectedRowData}
                                      />
                                    );
                                  case 'u':
                                    return (
                                      <URL
                                        formIndex={currentFormIndex}
                                        variables={cachedVariables}
                                      />
                                    );
                                  case 'vis':
                                    return <Vis formIndex={currentFormIndex} type={''} />;
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
                                        formIndex={currentFormIndex}
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
                                        formIndex={currentFormIndex}
                                        type={''}
                                      />
                                    );
                                  case 'gtcs':
                                    return (
                                      <GoogleTagConfigSettings
                                        formIndex={currentFormIndex}
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
                                <FormatValue formIndex={currentFormIndex} />
                              )}
                          </>
                        );
                      })()}
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

export default FormUpdateVariables;
