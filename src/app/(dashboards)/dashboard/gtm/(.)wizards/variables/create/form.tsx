'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { VariableSchemaType, FormSchema } from '@/src/lib/schemas/gtm/variables';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { FormCreateGTMProps, Variable } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { fetchAllVariables } from '../../../configurations/@variables/items';
import { createVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
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
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import AccountContainerWorkspaceRow from '../../built-in-variables/components';

const FormCreateVariable: React.FC<FormCreateGTMProps> = ({
  tierLimits,
  accounts,
  containers,
  workspaces,
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);
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

  useEffect(() => {
    // Ensure that we reset to the first step when the component mounts
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  const remainingCreateData = calculateRemainingLimit(tierLimits || [], 'GTMVariables', 'create');
  const remainingCreate = remainingCreateData.remaining;

  const gtmAccountContainerWorkspacesPairs = workspaces.reduce(
    (acc, item) => {
      const account = accounts.find((acc) => acc.accountId === item.accountId);
      const container = containers.find((cont) => cont.containerId === item.containerId);
      const workspace = workspaces.find((ws) => ws.workspaceId === item.workspaceId);

      const identifier = `${account.accountId}-${container.containerId}-${workspace.workspaceId}`;

      if (!acc.seen.has(identifier)) {
        acc.seen.add(identifier);
        acc.result.push({
          accountId: account.accountId,
          accountName: account.name,
          containerId: container.containerId,
          containerName: container.name,
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.name,
        });
      }

      return acc;
    },
    { seen: new Set(), result: [] }
  ).result;

  const configs = gtmFormFieldConfigs('GTMVariables', 'create', remainingCreate, {
    gtmAccountContainerWorkspacesPairs,
  });

  const formDataDefaults: Variable[] = [
    {
      accountContainerWorkspace: [
        {
          accountId: '',
          containerId: '',
          workspaceId: '',
        },
      ],
      name: '',
      type: 'k',
      decodeCookie: '',
      parameter: [
        { type: 'template', key: 'name', value: '' },
        { type: 'boolean', key: 'decodeCookie', value: 'false' },
      ],
      enablingTriggerId: [],
      disablingTriggerId: [],
    },
  ];

  const { formAmount, form, fields, addForm, count } = useFormInitialization<Variable>(
    formDataDefaults,
    FormSchema
  );

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['type', 'accountContainerWorkspace'], // Adjust fields to validate based on form structure
  });

  const onSubmit: SubmitHandler<VariableSchemaType> = processForm(
    createVariables,
    form.getValues(),
    () => form.reset({ forms: [formDataDefaults] }),
    dispatch,
    router,
    '/dashboard/gtm/configurations'
  );

  const selectedType =
    useWatch({
      control: form.control,
      name: `forms.${currentStep - 2}.type`,
    }) || 'k';

  if (errorModal) return errorModal;

  const renderStepOne = () => (
    <Form {...formAmount}>
      <form className="w-2/3 space-y-6">
        <FormFieldComponent
          name="amount"
          {...configs.amount}
          onChange={(value) => {
            handleAmountChange(value.toString(), form, addForm, dispatch);
          }}
        />
        <Button type="button" onClick={handleNext}>
          Next
        </Button>
      </form>
    </Form>
  );

  const renderStepForms = () => {
    // Render only the form corresponding to the current step - 2
    const formIndex = currentStep - 2;

    if (formIndex < 0 || formIndex >= fields.length) {
      return null; // Invalid step
    }

    const field = fields[formIndex];

    return (
      <div className="w-full">
        <div key={field.id} className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="max-w-xl mx-auto">
            <h1>Container {formIndex + 1}</h1>
            <div className="mt-12">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  id={`create-${formIndex}`}
                  className="space-y-6"
                >
                  {/* Render other form fields */}
                  {Object.entries(configs)
                    .filter(
                      ([key]) =>
                        key !== 'amount' &&
                        key !== 'accountId' &&
                        key !== 'containerId' &&
                        key !== 'workspaceId'
                    )
                    .map(([key, config]) => {
                      return (
                        <FormFieldComponent
                          key={key}
                          name={`forms.${formIndex}.${key}`}
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
                          return <FirstPartyCookie formIndex={currentStep - 2} type={''} />;
                        case 'aev':
                          return <AEV formIndex={currentStep - 2} type={''} />;
                        case 'c':
                          return <Constant formIndex={currentStep - 2} type={''} />;
                        case 'jsm':
                          return <CustomJS formIndex={currentStep - 2} type={''} />;
                        case 'v':
                          return <DataLayerVariable formIndex={currentStep - 2} type={''} />;
                        case 'd':
                          return <DOMElement formIndex={currentStep - 2} type={''} />;
                        case 'f':
                          return (
                            <HttpReferrer formIndex={currentStep - 2} variables={cachedVariables} />
                          );
                        case 'j':
                          return <JavaScriptVariable formIndex={currentStep - 2} type={''} />;
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
                          return <URL formIndex={currentStep - 2} variables={cachedVariables} />;
                        case 'vis':
                          return <Vis formIndex={currentStep - 2} type={''} />;
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
                          return <GoogleTagEventSettings formIndex={currentStep - 2} type={''} />;
                        case 'gtcs':
                          return <GoogleTagConfigSettings formIndex={currentStep - 2} type={''} />;
                        case 'ctv':
                          return <div>No configuration required for container version number</div>;
                        default:
                          return <div>Unknown Variable Type</div>;
                      }
                    })()}

                  {selectedType !== 'ctv' &&
                    selectedType !== 'r' &&
                    selectedType !== 'gtcs' &&
                    selectedType !== 'gtes' &&
                    selectedType !== 'aev' && <FormatValue formIndex={currentStep - 2} />}

                  <AccountContainerWorkspaceRow
                    accounts={accounts}
                    containers={containers}
                    workspaces={workspaces}
                    formIndex={formIndex}
                  />

                  <div className="flex justify-between">
                    {currentStep > 1 && (
                      <Button type="button" onClick={handlePrevious}>
                        Previous
                      </Button>
                    )}
                    {formIndex < count - 1 ? (
                      <Button
                        type="button"
                        onClick={async () => {
                          const isValid = await form.trigger(`forms.${formIndex}`);
                          if (isValid) {
                            handleNext();
                          } else {
                            console.log('Validation failed');
                          }
                        }}
                      >
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

  console.log('errors', form.formState.errors);

  return (
    <div className="flex items-center justify-center h-screen">
      {currentStep === 1 ? renderStepOne() : renderStepForms()}
    </div>
  );
};

export default FormCreateVariable;
