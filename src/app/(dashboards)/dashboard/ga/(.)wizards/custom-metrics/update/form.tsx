'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { FormSchema } from '@/src/lib/schemas/ga/metrics';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { CustomMetric, FormUpdateProps } from '@/src/types/types';

import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { updateGACustomMetrics } from '@/src/lib/fetch/dashboard/actions/ga/metrics';
import { CustomMetricSchemaType } from '@/src/lib/schemas/ga/metrics';

const FormUpdateCustomMetric: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);
  const currentFormIndex = currentStep - 1;

  useEffect(() => {
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);

  const remainingUpdateData = calculateRemainingLimit(
    tierLimits || [],
    'GA4CustomMetrics',
    'update'
  );
  const remainingUpdate = remainingUpdateData.remaining;
  useErrorRedirect(selectedRowData, router, '/dashboard/ga/properties');

  const selectedRowDataTransformed: Record<string, CustomMetric> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, row]) => [
      key,
      {
        name: row.name,
        parameterName: row.parameterName,
        displayName: row.displayName,
        description: row.description,
        account: row.account,
        property: row.property,
        scope: row.scope,
        measurementUnit: row.measurementUnit,
      } as CustomMetric,
    ])
  );

  // Correct mapping of formDataDefaults to align each row data with the current step
  const formDataDefaults: CustomMetric[] = Object.values(selectedRowData).map((row) => ({
    name: row.name,
    parameterName: row.parameterName,
    displayName: row.displayName,
    description: row.description,
    account: row.account,
    property: row.property,
    scope: row.scope,
    measurementUnit: row.measurementUnit,
  }));

  const { form, fields } = useFormInitialization<CustomMetric>(formDataDefaults, FormSchema);

  const measurementUnitValue = useWatch({
    control: form.control,
    name: `forms.${currentFormIndex}.measurementUnit`,
  });

  const configs = gaFormFieldConfigs(
    'GA4CustomMetrics',
    'update',
    remainingUpdate,
    selectedRowDataTransformed,
    measurementUnitValue
  );

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['displayName', 'parameterName', 'measurementUnit', 'restrictedMetricType'],
  });

  const onSubmit: SubmitHandler<CustomMetricSchemaType> = processForm(
    updateGACustomMetrics,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/ga/properties'
  );

  if (errorModal) return errorModal;

  const renderForms = () => {
    // Check if the current form index is within the bounds of the fields array
    if (currentFormIndex < 0 || currentFormIndex >= fields.length) {
      return null; // Return null or some fallback UI if out of bounds
    }

    // Get the field for the current form step
    const field = fields[currentFormIndex];

    const currentMetricName =
      formDataDefaults[currentFormIndex]?.displayName || `Metric ${currentFormIndex}`;

    return (
      <div className="w-full">
        <div
          key={field.id} // Adjust key indexing to match current step
          className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        >
          <div className="max-w-xl mx-auto">
            {/* Display the current property name */}
            <h1>{currentMetricName}</h1>
            <div className="mt-12">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  id="updateMetric"
                  className="space-y-6"
                >
                  {Object.entries(configs)
                    .filter(([key]) => key !== 'amount' && key !== 'parent')
                    .map(([key, config]) => (
                      <FormFieldComponent
                        key={key}
                        name={`forms.${currentFormIndex}.${key}`} // Ensure correct form name mapping
                        label={config.label}
                        description={config.description}
                        placeholder={config.placeholder}
                        type={config.type}
                        options={config.options}
                        disabled={
                          key === 'measurementUnit' &&
                          form.getValues(`forms.${currentFormIndex}.measurementUnit`) === 'CURRENCY'
                        }
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
                      <Button disabled={!form.formState.isValid} type="submit">
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

  return <div className="flex items-center justify-center h-screen">{renderForms()}</div>;
});

FormUpdateCustomMetric.displayName = 'FormUpdateCustomMetric';

export default FormUpdateCustomMetric;
