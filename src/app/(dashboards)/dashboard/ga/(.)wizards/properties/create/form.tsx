'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { FormSchemaType, FormsSchema } from '@/src/lib/schemas/ga/properties';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { FormCreateProps, GA4PropertyType } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import {
  useAccountsWithProperties,
  useErrorHandling,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { formFieldConfigs } from '@/src/utils/formFields';
import dynamic from 'next/dynamic';
const FormFieldComponent = dynamic(
  () => import('@/src/components/client/Utils/Form').then((mod) => mod.FormFieldComponent),
  { ssr: false }
);

const FormCreateProperty: React.FC<FormCreateProps> = React.memo(
  ({ tierLimits, properties = [], table = [], accounts = [] }) => {
    const dispatch = useDispatch();
    const loading = useSelector((state: RootState) => state.form.loading);
    const error = useSelector((state: RootState) => state.form.error);
    const currentStep = useSelector((state: RootState) => state.form.currentStep);
    const notFoundError = useSelector(selectTable).notFoundError;
    const router = useRouter();
    const errorModal = useErrorHandling(error, notFoundError);
    const accountsWithProperties = useAccountsWithProperties(accounts, properties);

    const remainingCreateData = calculateRemainingLimit(
      tierLimits || [],
      'GA4Properties',
      'create'
    );
    const remainingCreate = remainingCreateData.remaining;

    const configs = formFieldConfigs('create', remainingCreate, accountsWithProperties);

    const formDataDefaults: GA4PropertyType[] = [
      {
        name: table[0].displayName,
        parent: accountsWithProperties[0].name,
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

    const { formAmount, form, fields, addForm, propertyCount } = useFormInitialization(
      formDataDefaults,
      FormsSchema
    );

    // Use the custom hook
    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['displayName', 'parent', 'currencyCode', 'timeZone', 'industryCategory'],
    });

    const onSubmit: SubmitHandler<FormSchemaType> = processForm(
      createProperties,
      formDataDefaults,
      () => form.reset({ forms: [formDataDefaults] }),
      dispatch,
      router,
      '/dashboard/ga/properties'
    );

    if (errorModal) return errorModal;

    return (
      <div className="flex items-center justify-center h-screen">
        {/* Conditional rendering based on the currentStep */}
        {currentStep === 1 && (
          <Form {...formAmount}>
            <form className="w-2/3 space-y-6">
              {/* Amount selection logic */}
              <FormFieldComponent
                name="amount"
                {...configs.amount}
                onChange={(value) => {
                  handleAmountChange(value, form, addForm, dispatch);
                }}
              />
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </form>
          </Form>
        )}

        {currentStep > 1 && (
          <div className="w-full">
            {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
            {fields.length >= currentStep - 1 && (
              <div
                key={fields[currentStep - 2].id}
                className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
              >
                <div className="max-w-xl mx-auto">
                  <h1>Property {currentStep - 1}</h1>
                  <div className="mt-12">
                    {/* Form */}

                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        id="createProperty"
                        className="space-y-6"
                      >
                        <FormFieldComponent
                          name={`forms.${currentStep - 2}.displayName`}
                          {...configs.displayName}
                        />

                        <FormFieldComponent
                          name={`forms.${currentStep - 2}.parent`}
                          {...configs.parent}
                        />

                        <FormFieldComponent
                          name={`forms.${currentStep - 2}.currencyCode`}
                          {...configs.currencyCode}
                        />

                        <FormFieldComponent
                          name={`forms.${currentStep - 2}.timeZone`}
                          {...configs.timeZone}
                        />

                        <FormFieldComponent
                          name={`forms.${currentStep - 2}.industryCategory`}
                          {...configs.industryCategory}
                        />
                        <div className="flex justify-between">
                          <Button type="button" onClick={handlePrevious}>
                            Previous
                          </Button>

                          {currentStep - 1 < propertyCount ? (
                            <Button type="button" onClick={handleNext}>
                              Next
                            </Button>
                          ) : (
                            <Button type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
                          )}
                        </div>
                      </form>
                    </Form>

                    {/* End Form */}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

FormCreateProperty.displayName = 'FormCreateProperty';

export default FormCreateProperty;
