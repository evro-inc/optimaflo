'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { FormSchemaType, FormSchema } from '@/src/lib/schemas/ga/properties';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { FormCreateProps, GA4PropertyType } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import {
  createProperties,
  listGAProperties,
  updateDataRetentionSettings,
} from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import dynamic from 'next/dynamic';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { setCurrentStep } from '@/src/redux/formSlice';
import { toast } from 'sonner';
const FormFieldComponent = dynamic(
  () => import('@/src/components/client/Utils/Form').then((mod) => mod.FormFieldComponent),
  { ssr: false }
);

const FormCreateProperty: React.FC<FormCreateProps> = React.memo(
  ({ tierLimits, table = [], data = [] }) => {
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
      'GA4Properties',
      'create'
    );
    const remainingCreate = remainingCreateData.remaining;

    const configs = gaFormFieldConfigs('GA4Property', 'create', remainingCreate, data);

    // Add a fallback in case `accountsWithProperties` is empty
    const formDataDefaults: GA4PropertyType[] = [
      {
        name: table[0]?.displayName,
        parent: data[0]?.name, // Provide a default if `accountsWithProperties[0]` is undefined
        currencyCode: 'USD',
        displayName: '',
        industryCategory: 'AUTOMOTIVE',
        timeZone: 'America/New_York',
        propertyType: 'PROPERTY_TYPE_ORDINARY',
        retention: 'FOURTEEN_MONTHS',
        resetOnNewActivity: true,
        acknowledgment: true,
      },
    ];

    const { formAmount, form, fields, addForm, count } = useFormInitialization<GA4PropertyType>(
      formDataDefaults,
      FormSchema
    );

    // Use the custom hook
    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['displayName', 'parent', 'currencyCode', 'timeZone', 'industryCategory'],
    });

    /// NEED TO ADD updateDataRetentionSettings condition after successful createProperties
    const onSubmit: SubmitHandler<FormSchemaType> = processForm(
      createProperties,
      formDataDefaults,
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
            key={fields[currentStep - 2].id}
            className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
          >
            <div className="max-w-xl mx-auto">
              <h1>Property {currentStep - 1}</h1>
              <div className="mt-12">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    id="createContainer"
                    className="space-y-6"
                  >
                    {Object.entries(configs)
                      .filter(([key]) => key !== 'amount')
                      .map(([key, config]) => (
                        <FormFieldComponent
                          key={key}
                          name={`forms.${currentStep - 2}.${key}`}
                          label={config.label}
                          description={config.description}
                          placeholder={config.placeholder}
                          type={config.type}
                          options={config.options}
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

FormCreateProperty.displayName = 'FormCreateProperty';

export default FormCreateProperty;
