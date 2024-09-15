'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { CustomDimensionSchemaType, FormSchema } from '@/src/lib/schemas/ga/dimensions';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { CustomDimensionType, DimensionScope, FormCreateProps } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createGACustomDimensions } from '@/src/lib/fetch/dashboard/actions/ga/dimensions';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormCreateCustomDimension: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
}) => {
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
    'GA4CustomDimensions',
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

  console.log('accountsWithProperties', accountsWithProperties);

  const formDataDefaults: CustomDimensionType[] = [
    {
      name: '',
      parameterName: '',
      displayName: '',
      description: '',
      scope: DimensionScope.EVENT,
      disallowAdsPersonalization: true,
      account: accountsWithProperties[0].name,
      property: table[0].parent,
    },
  ];

  const { formAmount, form, fields, addForm, count } = useFormInitialization<CustomDimensionType>(
    formDataDefaults,
    FormSchema
  );

  const currentIndex = Math.max(0, currentStep - 2);
  const selectedAccountId = useWatch({
    control: form.control,
    name: `forms.${currentIndex}.account`,
  });

  const filteredProperties = properties.filter((property) => property.parent === selectedAccountId);
  const configs = gaFormFieldConfigs('GA4CustomDimensions', 'create', remainingCreate, {
    accountsWithProperties,
    filteredProperties,
  });

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['displayName', 'parent', 'currencyCode', 'timeZone', 'industryCategory'],
  });

  /// NEED TO ADD updateDataRetentionSettings condition after successful createProperties
  const onSubmit: SubmitHandler<CustomDimensionSchemaType> = processForm(
    createGACustomDimensions,
    formDataDefaults,
    () => form.reset({ forms: [formDataDefaults] }),
    dispatch,
    router,
    '/dashboard/ga/properties'
  );

  console.log('forms err', form.formState.errors);

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
                    .map(([key, config]) => {
                      const fieldOptions =
                        key === 'property'
                          ? filteredProperties.map((property) => ({
                              label: property.displayName,
                              value: property.name,
                            }))
                          : config.options;

                      return (
                        <FormFieldComponent
                          key={key}
                          name={`forms.${currentIndex}.${key}`}
                          label={config.label}
                          description={config.description}
                          placeholder={config.placeholder}
                          type={config.type}
                          options={fieldOptions}
                          onChange={() => {
                            if (key === 'account') {
                              form.setValue(`forms.${currentIndex}.property`, '');
                            }
                          }}
                        />
                      );
                    })}

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
};

FormCreateCustomDimension.displayName = 'FormCreateCustomDimension';

export default FormCreateCustomDimension;
