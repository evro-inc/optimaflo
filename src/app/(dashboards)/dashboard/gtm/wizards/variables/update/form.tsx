'use client';

import React, { useState } from 'react';
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
import { TransformedFormSchema } from '@/src/lib/schemas/gtm/variables';
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
import EntityComponent from '../components/entity';
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
import { variableTypeArray } from '../../../configurations/@variables/items';

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

type Forms = z.infer<typeof TransformedFormSchema>;

const FormUpdateVariables = () => {
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

  console.log('selectedRowData', selectedRowData);

  const tableData = Array.isArray(selectedRowData) ? selectedRowData : [selectedRowData];

  console.log('tableData', tableData);

  const formDataDefaults: Variable[] = Object.values(selectedRowData).map((rowData) => ({
    accountId: rowData.accountId,
    containerId: rowData.containerId,
    workspaceId: rowData.workspaceId,
    variableId: rowData.variableId,
    name: rowData.name,
    type: rowData.type,
    decodeCookie: rowData.decodeCookie || '',
    parameter: rowData.parameter || [],
    formatValue: rowData.formatValue || { caseConversionType: 'none' },
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
    resolver: zodResolver(TransformedFormSchema),
  });
  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  console.log('fields', fields);

  const selectedType = useWatch({
    control: form.control,
    name: `forms.${currentStep}.type`,
  });

  const handleNext = async () => {
    const currentFormIndex = currentStep - 2; // Adjusting for the array index and step count
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [`${currentFormPath}.name`, `${currentFormPath}.description`];

    // Now, trigger validation for these fields
    const isFormValid = await form.trigger(fieldsToValidate as any);

    if (isFormValid) {
      dispatch(incrementStep());
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { updateVersion } = data;

    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Updating versions...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueVersions = new Set<string>();

    for (const form of updateVersion) {
      const identifier = `${form.accountId}-${form.containerId}-${form.containerVersionId}`;
      if (uniqueVersions.has(identifier)) {
        toast.error(`Duplicate version found for ${form.name}`, {
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
      const res = (await UpdateVersions({ updateVersion })) as FeatureResponse;

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
          updateVersion: formDataDefaults,
        });
      }

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        updateVersion: formDataDefaults,
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
              key={fields[currentStep - 1].id}
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
                                name={`forms.${currentStep}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Variable Name: {fields[currentFormIndex]?.name}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={fields[currentFormIndex]?.name}
                                        {...form.register(`forms.${currentStep}.name`)}
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
                                name={`forms.${currentStep}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Variable Type</FormLabel>
                                    <FormDescription>
                                      This is the variable type you want to create.
                                    </FormDescription>
                                    <FormControl>
                                      <Select
                                        {...form.register(`forms.${currentStep}.type`)}
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
                                    return <FirstPartyCookie formIndex={currentStep} type={''} />;
                                  case 'aev':
                                    return <AEV formIndex={currentStep} type={''} />;
                                  case 'c':
                                    return <Constant formIndex={currentStep} type={''} />;
                                  case 'jsm':
                                    return <CustomJS formIndex={currentStep} type={''} />;
                                  case 'v':
                                    return <DataLayerVariable formIndex={currentStep} type={''} />;
                                  case 'd':
                                    return <DOMElement formIndex={currentStep} type={''} />;
                                  case 'f':
                                    return <HttpReferrer formIndex={currentStep} type={''} />;
                                  case 'j':
                                    return <JavaScriptVariable formIndex={currentStep} type={''} />;
                                  case 'smm':
                                    return (
                                      <LookupTableVariable
                                        formIndex={currentStep}
                                        type={'smm'}
                                        variables={cachedVariables}
                                      />
                                    );
                                  case 'remm':
                                    return (
                                      <LookupTableVariable
                                        formIndex={currentStep}
                                        type={'remm'}
                                        variables={cachedVariables}
                                      />
                                    );
                                  case 'u':
                                    return <URL formIndex={currentStep} type={''} />;
                                  case 'vis':
                                    return <Vis formIndex={currentStep} type={''} />;
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
                                        formIndex={currentStep}
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
                                      <GoogleTagEventSettings formIndex={currentStep} type={''} />
                                    );
                                  case 'gtcs':
                                    return (
                                      <GoogleTagConfigSettings formIndex={currentStep} type={''} />
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
                              selectedType !== 'gtes' && <FormatValue formIndex={currentStep} />}

                            <EntityComponent formIndex={currentStep} table={tableData} />
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

export default FormUpdateVariables;
