'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { ContainerSchemaType, FormSchema } from '@/src/lib/schemas/gtm/containers';
import { Button } from '@/src/components/ui/button';
import {
  Form,
} from '@/src/components/ui/form';
import { ContainerType, FormUpdateProps } from '@/src/types/types';
import {
  selectTable,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { updateContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { useErrorHandling, useErrorRedirect, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormUpdateContainer: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GTMContainer', 'update');
  const remainingUpdate = remainingUpdateData.remaining;

  useErrorRedirect(selectedRowData, router, '/dashboard/gtm/entities');

  const selectedRowDataTransformed: Record<string, ContainerType> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, rowData]) => [
      key,
      {
        accountId: rowData.accountId,
        usageContext: Array.isArray(rowData.usageContext) ? rowData.usageContext : [rowData.usageContext],
        name: rowData.name,
        domainName: rowData.domainName || '',
        notes: rowData.notes || '',
        containerId: rowData.containerId,
        publicId: rowData.publicId,
      } as ContainerType,
    ])
  );

  const configs = gtmFormFieldConfigs('GTMContainer', 'update', remainingUpdate, selectedRowDataTransformed);

  const formDataDefaults: ContainerType[] = Object.values(selectedRowData).map((rowData) => ({
    accountId: rowData.accountId,
    usageContext: Array.isArray(rowData.usageContext) ? rowData.usageContext : [rowData.usageContext],
    name: rowData.name,
    domainName: rowData.domainName || '',
    notes: rowData.notes || '',
    containerId: rowData.containerId,
    publicId: rowData.publicId,
    accountName: rowData.accountName,
  }));

  console.log('formDataDefaults', formDataDefaults);


  const { form, fields } = useFormInitialization<ContainerType>(formDataDefaults, FormSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['name', 'accountId', 'usageContext', 'domainName', 'notes'],
  });

  const onSubmit: SubmitHandler<ContainerSchemaType> = processForm(
    updateContainers,
    formDataDefaults,
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/gtm/entities'
  );

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
    console.log('Form isValid:', form.formState.isValid)
    console.log('Form errors:', form.formState.errors)
    console.log('Form values:', form.getValues());
    console.log('Fields:', fields);

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
                    .filter(([key]) => key !== 'amount' && key !== 'accountId' && key !== 'usageContext')
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
                      <Button type="submit">
                        {loading ? 'Submitting...' : 'Submit'}
                      </Button>
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
      {renderForms()}
    </div>

  );
});

FormUpdateContainer.displayName = 'FormUpdateContainer';

export default FormUpdateContainer;
