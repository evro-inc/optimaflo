'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { BuiltInVariableFormType, FormSchema } from '@/src/lib/schemas/gtm/builtInVariables';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { BuiltInVariable, BuiltInVariableType, FormCreateGTMProps } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import AccountContainerWorkspaceRow from '../components';

const FormCreateBuiltInVariable: React.FC<FormCreateGTMProps> = React.memo(
  ({ tierLimits, accounts = [], containers = [], workspaces = [] }) => {
    const dispatch = useDispatch();
    const loading = useSelector((state: RootState) => state.form.loading);
    const error = useSelector((state: RootState) => state.form.error);
    const currentStep = useSelector((state: RootState) => state.form.currentStep);
    const notFoundError = useSelector(selectTable).notFoundError;
    const router = useRouter();
    const errorModal = useErrorHandling(error, notFoundError);

    useEffect(() => {
      // Ensure that we reset to the first step when the component mounts
      dispatch(setCurrentStep(1));
    }, [dispatch]);

    const remainingCreateData = calculateRemainingLimit(
      tierLimits || [],
      'GTMBuiltInVariables',
      'create'
    );
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

    const configs = gtmFormFieldConfigs('GTMBuiltInVariables', 'create', remainingCreate, {
      gtmAccountContainerWorkspacesPairs,
    });

    const formDataDefaults: BuiltInVariable[] = [
      {
        path: '',
        type: '' as BuiltInVariableType,
        name: '',
        accountContainerWorkspace: [
          {
            accountId: '',
            containerId: '',
            workspaceId: '',
          },
        ],
      },
    ];

    const { formAmount, form, fields, addForm, count } = useFormInitialization<BuiltInVariable>(
      formDataDefaults,
      FormSchema
    );

    // Use the custom hook
    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['type', 'accountContainerWorkspace'], // Adjust fields to validate based on form structure
    });

    const onSubmit: SubmitHandler<BuiltInVariableFormType> = processForm(
      createBuiltInVariables,
      form.getValues(),
      () => form.reset({ forms: [formDataDefaults] }),
      dispatch,
      router,
      '/dashboard/gtm/configurations'
    );

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
                    id={`createContainer-${formIndex}`}
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
                    {/* Using AccountContainerWorkspaceRow with formIndex */}
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

    return (
      <div className="flex items-center justify-center h-screen">
        {currentStep === 1 ? renderStepOne() : renderStepForms()}
      </div>
    );
  }
);

FormCreateBuiltInVariable.displayName = 'FormCreateBuiltInVariable';

export default FormCreateBuiltInVariable;
