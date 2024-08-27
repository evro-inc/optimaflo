'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { ContainerSchemaType, FormSchema } from '@/src/lib/schemas/gtm/containers';
import { Button } from '@/src/components/ui/button';
import {
  Form
} from '@/src/components/ui/form';
import { FormCreateProps, ContainerType } from '@/src/types/types';
import {
  selectTable,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { CreateContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { setCurrentStep } from '@/src/redux/formSlice';

const FormCreateContainer: React.FC<FormCreateProps> = React.memo(({ tierLimits, accounts = [] }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const count = useSelector((state: RootState) => state.form.count);
  const errorModal = useErrorHandling(error, notFoundError);

  useEffect(() => {
    // Ensure that we reset to the first step when the component mounts
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  const remainingCreateData = calculateRemainingLimit(
    tierLimits || [],
    'GTMContainer',
    'create'
  );
  const remainingCreate = remainingCreateData.remaining;

  const configs = gtmFormFieldConfigs('GTMContainer', 'create', remainingCreate, accounts);

  const formDataDefaults: ContainerType[] = [
    {
      accountId: '',
      usageContext: '',
      name: '',
      domainName: '',
      notes: '',
      containerId: '',
      publicId: '',
    },
  ];

  const { formAmount, form, fields, addForm } = useFormInitialization<ContainerType>(
    formDataDefaults,
    FormSchema
  );

  // Use the custom hook
  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['name', 'accountId', 'usageContext', 'domainName', 'notes'],
  });

  const onSubmit: SubmitHandler<ContainerSchemaType> = processForm(
    CreateContainers,
    formDataDefaults,
    () => form.reset({ forms: [formDataDefaults] }),
    dispatch,
    router,
    '/dashboard/gtm/entities'
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

  const renderStepForms = () => {
    const currentPropertyName = formDataDefaults[currentStep - 1]?.name;

    return (
      <div className="w-full">
        {fields.length >= currentStep - 1 && (
          <div
            key={fields[currentStep - 2].id}
            className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
          >
            <div className="max-w-xl mx-auto">
              <h1>{currentPropertyName}</h1>
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
    )
  };


  return (
    <div className="flex items-center justify-center h-screen">
      {currentStep === 1 ? renderStepOne() : renderStepForms()}
    </div>
  );
});

FormCreateContainer.displayName = 'FormCreateContainer';

export default FormCreateContainer;
