'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { CustomMetric, FormCreateProps, MeasurementUnit, MetricScope } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createGACustomMetrics } from '@/src/lib/fetch/dashboard/actions/ga/metrics';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { setCurrentStep } from '@/src/redux/formSlice';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { CustomMetricSchemaType, FormSchema } from '@/src/lib/schemas/ga/metrics';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { measurementUnit, RestrictedMetric } from '../../../properties/@metrics/items';

const FormCreateCustomMetric: React.FC<FormCreateProps> = React.memo(
  ({ tierLimits, properties = [], table = [], accounts = [] }) => {
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
      'GA4CustomMetrics',
      'create'
    );
    const remainingCreate = remainingCreateData.remaining;
    const accountsWithProperties = accounts
      .map((account) => {
        const accountProperties = properties.filter((property) => property.parent === account.name);

        return {
          ...account,
          properties: accountProperties,
        };
      })
      .filter((account) => account.properties.length > 0);

    const formDataDefaults: CustomMetric[] = [
      {
        name: '',
        parameterName: '',
        displayName: '',
        description: '',
        measurementUnit: MeasurementUnit.MEASUREMENT_UNIT_UNSPECIFIED,
        scope: MetricScope.EVENT,
        account: accountsWithProperties[0].name,
        property: table[0].parent,
      },
    ];

    const { formAmount, form, fields, addForm, count } = useFormInitialization<CustomMetric>(
      formDataDefaults,
      FormSchema
    );

    const currentIndex = Math.max(0, currentStep - 2);

    const selectedAccountId = useWatch({
      control: form.control,
      name: `forms.${currentIndex}.account`,
    });
    const measurementUnitValue = useWatch({
      control: form.control,
      name: `forms.${currentIndex}.measurementUnit`,
    });

    const filteredProperties = properties.filter(
      (property) => property.parent === selectedAccountId
    );
    const configs = gaFormFieldConfigs(
      'GA4CustomMetrics',
      'create',
      remainingCreate,
      {
        accountsWithProperties,
        filteredProperties,
        measurementUnit,
        RestrictedMetric,
      },
      measurementUnitValue
    );

    // Use the custom hook
    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['displayName', 'account', 'property', 'type'],
    });

    const onSubmit: SubmitHandler<CustomMetricSchemaType> = processForm(
      createGACustomMetrics,
      form.getValues(),
      () => form.reset({ forms: [formDataDefaults] }),
      dispatch,
      router,
      '/dashboard/ga/properties'
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

    const renderStepForms = () => (
      <div className="w-full">
        {fields.length >= currentStep - 1 && (
          <div
            key={fields[currentIndex].id}
            className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
          >
            <div className="max-w-xl mx-auto">
              <h1>Custom Metric {currentStep - 1}</h1>
              <div className="mt-12">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    id="createContainer"
                    className="space-y-6"
                  >
                    {Object.entries(configs)
                      .filter(([key]) => key !== 'amount') // Exclude the amount field
                      .map(([key, config]) => (
                        <FormFieldComponent
                          key={key}
                          name={`forms.${currentIndex}.${key}`}
                          label={config.label}
                          description={config.description}
                          placeholder={config.placeholder}
                          type={config.type}
                          options={config.options} // Ensure options are passed for select fields
                        />
                      ))}

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
        )}
      </div>
    );

    return (
      <div className="flex items-center justify-center h-screen">
        {currentStep === 1 ? renderStepOne() : renderStepForms()}
      </div>
    );
  }
);

FormCreateCustomMetric.displayName = 'FormCreateCustomMetric';

export default FormCreateCustomMetric;
