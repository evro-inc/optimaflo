'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { FormSchema, KeyEvents } from '@/src/lib/schemas/ga/keyEvents';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { KeyEventType, FormCreateProps, CountingMethod } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';

const FormCreateKeyEvents: React.FC<FormCreateProps> = React.memo(
  ({ tierLimits, properties = [], accounts = [] }) => {
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

    const remainingCreateData = calculateRemainingLimit(tierLimits || [], 'GA4KeyEvents', 'create');
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

    const formDataDefaults: KeyEventType[] = [
      {
        accountProperty: accountsWithProperties[0].name,
        eventName: '',
        countingMethod: CountingMethod.ONCE_PER_EVENT,
        defaultValue: undefined,
        includeDefaultValue: 'false',
      },
    ];

    const { formAmount, form, fields, addForm, count } = useFormInitialization<KeyEventType>(
      formDataDefaults,
      FormSchema
    );

    const currentIndex = Math.max(0, currentStep - 2);

    const selectedAccountId = useWatch({
      control: form.control,
      name: `forms.${currentIndex}.account`,
    });

    const includeDefaultValue = useWatch({
      control: form.control,
      name: `forms.${currentIndex}.includeDefaultValue`,
    });

    const handleNumericValueChange = (value: string, index: number) => {
      const parsedValue = parseFloat(value);
      form.setValue(
        `forms.${index}.defaultValue.numericValue`,
        isNaN(parsedValue) ? undefined : parsedValue
      );
    };

    const filteredProperties = properties.filter(
      (property) => property.parent === selectedAccountId
    );
    const configs = gaFormFieldConfigs(
      'GA4KeyEvents',
      'create',
      remainingCreate,
      {
        accountsWithProperties,
        filteredProperties,
      },
      includeDefaultValue
    );

    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: [
        'eventName',
        'countingMethod',
        'defaultValue.currencyCode',
        'defaultValue.numericValue',
      ],
    });

    const onSubmit: SubmitHandler<KeyEvents> = processForm(
      createGAKeyEvents,
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
              <h1>Property {currentStep - 1}</h1>
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
                          options={config.options}
                          onChange={(value) => {
                            // If value is a string[], join it or handle it based on your requirements
                            const stringValue = Array.isArray(value) ? value.join('') : value;

                            if (key === 'defaultValue.numericValue') {
                              handleNumericValueChange(stringValue, currentIndex); // Ensure it's a string
                            }
                          }}
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
FormCreateKeyEvents.displayName = 'FormCreateKeyEvents';

export default FormCreateKeyEvents;
