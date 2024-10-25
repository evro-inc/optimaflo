'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';

import { FormUpdateProps, Variable } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { FormSchema, VariableSchemaType } from '@/src/lib/schemas/gtm/variables';
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

import { fetchAllVariables } from '../../../configurations/@variables/items';
import { updateVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';

const FormUpdateVariables: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);
  const [cachedVariables, setCachedVariables] = useState<any[]>([]); // State to store fetched variables
  const currentFormIndex = currentStep - 1;

  useEffect(() => {
    // Ensure that we reset to the first step when the component mounts
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GTMVariables', 'update');
  const remainingUpdate = remainingUpdateData.remaining;
  useErrorRedirect(selectedRowData, router, '/dashboard/gtm/configurations');

  const formDataDefaults: Variable[] = Object.values(selectedRowData).map((rowData) => ({
    accountContainerWorkspace: [
      {
        accountId: rowData.accountId,
        containerId: rowData.containerId,
        workspaceId: rowData.workspaceId,
        variableId: rowData.variableId,
      },
    ],
    variableId: rowData.variableId,
    name: rowData.name,
    type: rowData.type,
    parameter: rowData.parameter || [],
    formatValue: { caseConversionType: 'none' },
  }));

  const configs = gtmFormFieldConfigs('GTMVariables', 'update', remainingUpdate, formDataDefaults);

  const { form, fields } = useFormInitialization<Variable>(formDataDefaults, FormSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['type', 'accountContainerWorkspace'],
  });

  const selectedType =
    useWatch({
      control: form.control,
      name: `forms.${currentFormIndex}.type`,
    }) || 'k';

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

  const onSubmit: SubmitHandler<VariableSchemaType> = processForm(
    updateVariables,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/gtm/configurations'
  );

  if (Object.keys(selectedRowData).length === 0) {
    // Redirect to the entities page
    router.push('/dashboard/gtm/configurations');
    return null;
  }

  if (errorModal) return errorModal;

  const renderForms = () => {
    // Calculate the index for the current form to display
    // Adjust for 0-based index

    // Check if the current form index is within the bounds of the fields array
    if (currentFormIndex < 0 || currentFormIndex >= fields.length) {
      return null; // Return null or some fallback UI if out of bounds
    }

    // Get the field for the current form step
    const field = fields[currentFormIndex];

    // Use the currentPropertyIndex directly for the form values
    const currentPropertyName = formDataDefaults[currentFormIndex]?.name;

    return (
      <div className="w-full">
        {/* Render only the form corresponding to the current step */}
        <div
          key={field.id} // Use field.id here for unique key
          className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        >
          <div className="max-w-xl mx-auto">
            {/* Display the current property name */}
            <h1>{currentPropertyName}</h1>
            <div className="mt-12">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  id="updateProperty"
                  className="space-y-6"
                >
                  {Object.entries(configs)
                    .filter(
                      ([key]) =>
                        key !== 'accountId' && key !== 'containerId' && key !== 'workspaceId'
                    )
                    .map(([key, config]) => {
                      return (
                        <FormFieldComponent
                          key={key}
                          name={`forms.${currentFormIndex}.${key}`}
                          label={config.label}
                          description={config.description}
                          placeholder={config.placeholder}
                          type={config.type}
                          options={config.options}
                        />
                      );
                    })}
                  {selectedType &&
                    (() => {
                      switch (selectedType) {
                        case 'k':
                          return <FirstPartyCookie formIndex={currentFormIndex} type={''} />;
                        case 'aev':
                          return <AEV formIndex={currentFormIndex} type={''} />;
                        case 'c':
                          return <Constant formIndex={currentFormIndex} type={''} />;
                        case 'jsm':
                          return <CustomJS formIndex={currentFormIndex} type={''} />;
                        case 'v':
                          return <DataLayerVariable formIndex={currentFormIndex} type={''} />;
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
                          return <JavaScriptVariable formIndex={currentFormIndex} type={''} />;
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
                          return <URL formIndex={currentFormIndex} variables={cachedVariables} />;
                        case 'vis':
                          return <Vis formIndex={currentFormIndex} type={''} />;
                        case 'e':
                          return <div>No configuration required for custom event</div>;
                        case 'ev':
                          return <div>No configuration required for environment name</div>;
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
                          return <GoogleTagEventSettings formIndex={currentFormIndex} type={''} />;
                        case 'gtcs':
                          return <GoogleTagConfigSettings formIndex={currentFormIndex} type={''} />;
                        case 'ctv':
                          return <div>No configuration required for container version number</div>;
                        default:
                          return <div>Unknown Variable Type</div>;
                      }
                    })()}

                  {selectedType !== 'ctv' &&
                    selectedType !== 'r' &&
                    selectedType !== 'gtcs' &&
                    selectedType !== 'gtes' && <FormatValue formIndex={currentFormIndex} />}

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
            </div>
          </div>
        </div>
      </div>
    );
  };

  return <div className="flex items-center justify-center h-screen">{renderForms()}</div>;

  /*   useEffect(() => {
      formDataDefaults.forEach((data, index) => {
        form.setValue(`forms.${index}.accountId`, data.accountId);
        form.setValue(`forms.${index}.containerId`, data.containerId);
        form.setValue(`forms.${index}.workspaceId`, data.workspaceId);
        form.setValue(`forms.${index}.variableId`, data.variableId);
      });
    }, [form, formDataDefaults]); */
});

FormUpdateVariables.displayName = 'FormUpdateVariables';

export default FormUpdateVariables;
