'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { CountingMethod, FormUpdateProps, KeyEventType } from '@/src/types/types';
import { updateGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { setCurrentStep } from '@/src/redux/formSlice';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { FormSchema, KeyEvents } from '@/src/lib/schemas/ga/keyEvents';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormUpdateKeyEvents: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);
  const currentIndex = currentStep - 1;

  useEffect(() => {
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);

  console.log('selectedRowData', selectedRowData);

  //// defaultvalue not in selectedRowData

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GA4KeyEvents', 'update');
  const remainingUpdate = remainingUpdateData.remaining;
  useErrorRedirect(selectedRowData, router, '/dashboard/ga/properties');

  const selectedRowDataTransformed: Record<string, KeyEventType> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, row]) => [
      key,
      {
        account: row.account,
        property: row.property,
        name: row.name,
        eventName: row.eventName,
        countingMethod: row.countingMethod ?? CountingMethod.ONCE_PER_EVENT,
        defaultValue: row.defaultValue
          ? {
              numericValue: row.defaultValue.numericValue,
              currencyCode: row.defaultValue.currencyCode,
            }
          : undefined,
        includeDefaultValue: row.defaultValue ? 'true' : 'false',
      } as KeyEventType,
    ])
  );

  const formDataDefaults: KeyEventType[] = Object.values(selectedRowData).map((row) => ({
    account: row.account,
    property: row.property,
    name: row.name,
    eventName: row.eventName,
    countingMethod: row.countingMethod ?? CountingMethod.ONCE_PER_EVENT,
    defaultValue: row.defaultValue
      ? {
          numericValue: row.defaultValue.numericValue,
          currencyCode: row.defaultValue.currencyCode,
        }
      : undefined,
    includeDefaultValue: row.defaultValue ? 'true' : 'false',
  }));

  console.log('formDataDefaults', formDataDefaults);

  const { form, fields } = useFormInitialization<KeyEventType>(formDataDefaults, FormSchema);

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

  const configs = gaFormFieldConfigs(
    'GA4KeyEvents',
    'update',
    remainingUpdate,
    selectedRowDataTransformed,
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
    updateGAKeyEvents,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/ga/properties'
  );

  if (errorModal) return errorModal;

  console.log('form er', form.formState.errors);

  const renderForms = () => {
    // Check if the current form index is within the bounds of the fields array
    if (currentIndex < 0 || currentIndex >= fields.length) {
      return null; // Return null or some fallback UI if out of bounds
    }

    // Get the field for the current form step
    const field = fields[currentIndex];

    const keyEventName = formDataDefaults[currentIndex]?.eventName || `Key Event ${currentIndex}`;

    return (
      <div className="w-full">
        <div
          key={field.id} // Adjust key indexing to match current step
          className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        >
          <div className="max-w-xl mx-auto">
            {/* Display the current property name */}
            <h1>{keyEventName}</h1>
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

FormUpdateKeyEvents.displayName = 'FormUpdateKeyEvents';

export default FormUpdateKeyEvents;
