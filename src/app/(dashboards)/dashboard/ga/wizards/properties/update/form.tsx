'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { FormSchemaType, FormsSchema } from '@/src/lib/schemas/ga/properties';
import { Button } from '@/src/components/ui/button';
import { FormUpdateProps, GA4PropertyType } from '@/src/types/types';
import { updateProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { Form } from '@/src/components/ui/form';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';

const FormUpdateProperty: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GA4Properties', 'update');
  const remainingUpdate = remainingUpdateData.remaining;

  useEffect(() => {
    if (Object.keys(selectedRowData).length === 0) {
      router.push('/dashboard/ga/properties'); // Replace with your redirect path
    }
  }, [selectedRowData, router]);

  const selectedRowDataTransformed: Record<string, GA4PropertyType> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, row]) => [
      key,
      {
        name: row.name,
        parent: row.parent,
        displayName: row.displayName,
        timeZone: row.timeZone,
        currencyCode: row.currencyCode,
        serviceLevel: row.serviceLevel,
        propertyType: row.propertyType,
        industryCategory: row.industryCategory,
        retention: row.retention,
        resetOnNewActivity: row.resetOnNewActivity,
        acknowledgment: row.acknowledgment,
      } as GA4PropertyType,
    ])
  );

  const configs = gaFormFieldConfigs('GA4Property', 'update', remainingUpdate, selectedRowDataTransformed);

  // Correct mapping of formDataDefaults to align each row data with the current step
  const formDataDefaults: GA4PropertyType[] = Object.values(selectedRowData).map((rowData) => ({
    name: rowData.displayName,
    parent: rowData.name,
    currencyCode: rowData.currencyCode,
    displayName: rowData.displayName,
    industryCategory: rowData.industryCategory,
    timeZone: rowData.timeZone,
    propertyType: rowData.propertyType,
    retention: rowData.retention,
    resetOnNewActivity: rowData.resetOnNewActivity,
    acknowledgment: rowData.acknowledgment,
  }));

  const { form, fields } = useFormInitialization<GA4PropertyType>(formDataDefaults, FormsSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['displayName', 'parent', 'currencyCode', 'timeZone', 'industryCategory'],
  });

  const onSubmit: SubmitHandler<FormSchemaType> = processForm(
    updateProperties,
    formDataDefaults,
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/ga/properties'
  );

  if (errorModal) return errorModal;

  const renderForms = () => {
    const currentFormIndex = currentStep - 1; // Adjust for zero-based indexing
    // Use the currentFormIndex directly for the form values

    // Check if the current form index is within the bounds of the fields array
    if (currentFormIndex < 0 || currentFormIndex >= fields.length) {
      return null; // Return null or some fallback UI if out of bounds
    }

    // Get the field for the current form step
    const field = fields[currentFormIndex];


    const currentPropertyName = formDataDefaults[currentFormIndex]?.displayName || `Property ${currentFormIndex}`;

    return (
      <div className="w-full">
        <div
          key={field.id} // Adjust key indexing to match current step
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
                    .filter(([key]) => key !== 'amount' && key !== 'parent')
                    .map(([key, config]) => (
                      <FormFieldComponent
                        key={key}
                        name={`forms.${currentStep - 1}.${key}`} // Ensure correct form name mapping
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
                      <Button disabled={!form.formState.isValid} type="button" onClick={handleNext}>
                        Next
                      </Button>
                    ) : (
                      <Button disabled={!form.formState.isValid} type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
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

FormUpdateProperty.displayName = 'FormUpdateProperty';

export default FormUpdateProperty;
