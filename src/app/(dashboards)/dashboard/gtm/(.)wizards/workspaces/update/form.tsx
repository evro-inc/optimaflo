'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { FormSchema, WorkspaceSchemaType } from '@/src/lib/schemas/gtm/workspaces';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { FormUpdateProps, WorkspaceType } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { updateWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormUpdateWorkspace: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
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

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GTMWorkspaces', 'update');
  const remainingUpdate = remainingUpdateData.remaining;

  useErrorRedirect(selectedRowData, router, '/dashboard/gtm/entities');

  const selectedRowDataTransformed: Record<string, WorkspaceType> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, rowData]) => [
      key,
      {
        accountId: rowData.accountId,
        workspaceId: rowData.workspaceId,
        name: rowData.name,
        description: rowData.description,
        containerId: rowData.containerId,
        containerName: rowData.containerName,
      } as WorkspaceType,
    ])
  );

  const configs = gtmFormFieldConfigs(
    'GTMWorkspace',
    'update',
    remainingUpdate,
    selectedRowDataTransformed
  );

  const formDataDefaults: WorkspaceType[] = Object.values(selectedRowData).map((rowData) => ({
    accountId: rowData.accountId,
    workspaceId: rowData.workspaceId,
    name: rowData.name,
    description: rowData.description,
    containerId: rowData.containerId,
    containerName: rowData.containerName,
  }));

  const { form, fields } = useFormInitialization<WorkspaceType>(formDataDefaults, FormSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['name', 'accountId', 'usageContext', 'domainName', 'notes'],
  });

  const onSubmit: SubmitHandler<WorkspaceSchemaType> = processForm(
    updateWorkspaces,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/gtm/entities'
  );

  if (Object.keys(selectedRowData).length === 0) {
    // Redirect to the entities page
    router.push('/dashboard/gtm/entities');
    return null;
  }

  if (errorModal) return errorModal;

  const renderForms = () => {
    // Calculate the index for the current form to display
    const currentFormIndex = currentStep - 1; // Adjust for 0-based index

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
                  id="updateWorkspace"
                  className="space-y-6"
                >
                  {Object.entries(configs)
                    .filter(
                      ([key]) => key !== 'amount' && key !== 'accountId' && key !== 'usageContext'
                    )
                    .map(([key, config]) => (
                      <FormFieldComponent
                        key={key}
                        name={`forms.${currentFormIndex}.${key}`} // Use currentFormIndex for form field name mapping
                        label={config.label}
                        description={config.description}
                        placeholder={config.placeholder}
                        type={config.type}
                        options={config.options}
                      />
                    ))}
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
});

FormUpdateWorkspace.displayName = 'FormUpdateWorkspace';

export default FormUpdateWorkspace;
