'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { Button } from '@/src/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import { FormCreateProps, GA4StreamType } from '@/src/types/types';
import { createGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { FormSchema } from '@/src/lib/schemas/ga/streams';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { FormSchemaType } from '@/src/lib/schemas/ga/properties';
import { dataStreamTypeMapping } from '../../../properties/@streams/streamItems';
import { Input } from '@/src/components/ui/input';

const FormCreateStream: React.FC<FormCreateProps> = ({
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

  const remainingCreateData = calculateRemainingLimit(tierLimits || [], 'GA4Streams', 'create');
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

  const formDataDefaults: GA4StreamType[] = [
    {
      account: accountsWithProperties[0].name,
      property: table[0].parent,
      displayName: '',
      parentURL: '',
      type: table[0].type,
      webStreamData: {
        defaultUri: '',
      },
      androidAppStreamData: {
        packageName: '',
      },
      iosAppStreamData: {
        bundleId: '',
      },
      name: '',
      accountId: '',
      parent: '',
    },
  ];

  const { formAmount, form, fields, addForm, count } = useFormInitialization<GA4StreamType>(
    formDataDefaults,
    FormSchema
  );

  // Use the custom hook
  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['displayName', 'account', 'property', 'type'],
  });

  const onSubmit: SubmitHandler<FormSchemaType> = processForm(
    createGAPropertyStreams,
    formDataDefaults,
    () => form.reset({ forms: [formDataDefaults] }),
    dispatch,
    router,
    '/dashboard/ga/properties'
  );

  const currentIndex = Math.max(0, currentStep - 2);
  const selectedAccountId = form.watch(`forms.${currentIndex}.account`);
  const filteredProperties = properties.filter((property) => property.parent === selectedAccountId);
  const configs = gaFormFieldConfigs('GA4Streams', 'create', remainingCreate, {
    accountsWithProperties,
    filteredProperties, // Pass filtered properties here
    type: dataStreamTypeMapping, // Example for stream type
  });

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
                        options={config.options} // Ensure options are passed for select fields
                      />
                    ))}

                  {/* Dynamic fields based on stream type */}
                  {Object.keys(dataStreamTypeMapping).map((type) => {
                    const streamTypeValue = form.watch(`forms.${currentIndex}.type`);
                    if (streamTypeValue === type) {
                      // Compare with the key, not the value
                      return (
                        <FormField
                          key={type}
                          control={form.control}
                          name={`forms.${currentIndex}.${
                            type === 'WEB_DATA_STREAM'
                              ? 'webStreamData.defaultUri'
                              : type === 'ANDROID_APP_DATA_STREAM'
                              ? 'androidAppStreamData.packageName'
                              : 'iosAppStreamData.bundleId'
                          }`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{dataStreamTypeMapping[type]} Input</FormLabel>
                              <FormDescription>
                                This is the input for {dataStreamTypeMapping[type]}.
                              </FormDescription>
                              <FormControl>
                                <Input
                                  placeholder={`Enter ${dataStreamTypeMapping[type]} input`}
                                  {...form.register(
                                    `forms.${currentIndex}.${
                                      type === 'WEB_DATA_STREAM'
                                        ? 'webStreamData.defaultUri'
                                        : type === 'ANDROID_APP_DATA_STREAM'
                                        ? 'androidAppStreamData.packageName'
                                        : 'iosAppStreamData.bundleId'
                                    }`
                                  )}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      );
                    }
                    return null; // Return null if the condition is not met
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

FormCreateStream.displayName = 'FormCreateStream';

export default FormCreateStream;
