'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { Audience, FormSchema } from '@/src/lib/schemas/ga/audiences';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { ConversionEvent, FormUpdateProps } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { updateGAAudiences } from '@/src/lib/fetch/dashboard/actions/ga/audiences';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormUpdateConversionEvent: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
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

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GA4Audiences', 'update');
  const remainingUpdate = remainingUpdateData.remaining;
  useErrorRedirect(selectedRowData, router, '/dashboard/ga/properties');

  const formDataDefaults: ConversionEvent[] = Object.values(selectedRowData).map((rowData) => ({
    account: rowData.account,
    property: rowData.property,
    eventName: rowData.eventName,
    countingMethod: rowData.countingMethod,
    defaultConversionValue: { type: 'none', value: '0', currencyCode: 'USD' },
    name: rowData.name,
  }));

  const { form, fields } = useFormInitialization<ConversionEvent>(formDataDefaults, FormSchema);

  const configs = gaFormFieldConfigs(
    'GA4CustomMetrics',
    'update',
    remainingUpdate,
    formDataDefaults
  );

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: [
      'countingMethod',
      'defaultConversionValue',
      'defaultConversionValue.value',
      'restrictedMetricType',
    ],
  });

  const onSubmit: SubmitHandler<Audience> = processForm(
    updateGAAudiences,
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
      formDataDefaults[currentFormIndex]?.name || `Metric ${currentFormIndex}`;

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

  /*   return (
      <div className="flex items-center justify-center h-screen">
  
        {currentStep && (
          <div className="w-full">
  
            {fields.length > 0 && fields.length >= currentStep && (
              <div
                key={fields[currentStep - 1].id}
                className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
              >
                <div className="max-w-xl mx-auto">
                  <h1>{fields[currentFormIndex]?.eventName}</h1>
                  <div className="mt-12">
  
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(processForm)}
                        id={`updateConversionEvent-${currentFormIndex}`}
                        className="space-y-6"
                      >
                        {fields.length > 0 &&
                          fields.map((field, index) => {
                            if (index === currentStep - 1) {
                              return (
                                <>
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentFormIndex}.countingMethod`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Counting method (conversion)</FormLabel>
                                        <FormDescription>
                                          Choose how to count this conversion. The counting method you
                                          choose will be used to count future conversion actions; it
                                          will not be used to count past data.
                                        </FormDescription>
                                        <FormControl>
                                          <Select
                                            {...form.register(
                                              `forms.${currentFormIndex}.countingMethod`
                                            )}
                                            {...field}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger className="w-[180px]">
                                              <SelectValue placeholder="Select counting method." />
                                            </SelectTrigger>
  
                                            <SelectContent>
                                              <SelectGroup>
                                                <SelectLabel>Counting Method</SelectLabel>
                                                {ConversionCountingItems.map((item) => (
                                                  <SelectItem key={item.label} value={item.id}>
                                                    {item.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectGroup>
                                            </SelectContent>
                                          </Select>
                                        </FormControl>
  
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
  
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentFormIndex}.defaultConversionValue`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-3">
                                        <FormLabel>Default Conversion Value</FormLabel>
                                        <FormControl>
                                          <RadioGroup
                                            onValueChange={(newValue) => {
                                              if (newValue === 'none') {
                                                form.setValue(
                                                  `forms.${currentFormIndex}.defaultConversionValue`,
                                                  { type: 'none', value: '0', currencyCode: 'USD' }
                                                );
                                              } else {
                                                // Maintain the existing values but indicate that a value should be set
                                                form.setValue(
                                                  `forms.${currentFormIndex}.defaultConversionValue`,
                                                  {
                                                    type: 'conversionValue',
                                                    value: '0',
                                                    currencyCode: 'USD',
                                                  }
                                                ); // Set a default structure for 'conversionValue'
                                              }
                                            }}
                                            defaultValue={field.value?.type}
                                            className="flex flex-col space-y-1"
                                          >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="none" />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                Do not set a default conversion value
                                              </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="conversionValue" />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                Set a default conversion value
                                              </FormLabel>
                                              {field.value?.type === 'conversionValue' && (
                                                <div className="flex items-center space-x-3">
                                                  <Input
                                                    placeholder="Enter default conversion value"
                                                    {...form.register(
                                                      `forms.${currentFormIndex}.defaultConversionValue.value`
                                                    )}
                                                  />
  
                                                  <Select
                                                    value={form.watch(
                                                      `forms.${currentFormIndex}.defaultConversionValue.currencyCode`
                                                    )}
                                                    onValueChange={(selectedCurrency) => {
                                                      form.setValue(
                                                        `forms.${currentFormIndex}.defaultConversionValue.currencyCode`,
                                                        selectedCurrency,
                                                        { shouldValidate: true }
                                                      );
                                                    }}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select currency" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectGroup>
                                                        {Object.entries(Currencies).map(
                                                          ([code, name]) => (
                                                            <SelectItem key={code} value={code}>
                                                              {code} - {name}
                                                            </SelectItem>
                                                          )
                                                        )}
                                                      </SelectGroup>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              )}
                                            </FormItem>
                                          </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              );
                            }
                            return null;
                          })}
  
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
            )}
          </div>
        )}
      </div>
    ); */
});

FormUpdateConversionEvent.displayName = 'FormUpdateConversionEvent';
export default FormUpdateConversionEvent;
