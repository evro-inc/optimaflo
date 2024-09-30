'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { FormSchema, FormSchemaType } from '@/src/lib/schemas/gtm/accounts';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { FormUpdateProps, GTMAccountType } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { updateAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { useErrorHandling, useErrorRedirect, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { processForm } from '@/src/utils/utils';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';

const FormUpdateAccount: React.FC<FormUpdateProps> = React.memo(() => {
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

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);

  useErrorRedirect(selectedRowData, router, '/dashboard/gtm/entities');

  const selectedRowDataTransformed: Record<string, GTMAccountType> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, row]) => [
      key,
      {
        name: row.name,
        accountId: row.accountId,
      } as GTMAccountType,
    ])
  );

  const configs = gtmFormFieldConfigs(
    'GTMAccount',
    'update',
    10000,
    selectedRowDataTransformed
  );

  const formDataDefaults: GTMAccountType[] = Object.values(selectedRowData).map((rowData) => ({
    name: rowData.name,
    accountId: rowData.accountId,
  }));

  const { form, fields } = useFormInitialization<GTMAccountType>(formDataDefaults, FormSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['name'],
  });

  console.log("form.getValues()", form.getValues());


  const onSubmit: SubmitHandler<FormSchemaType> = processForm(
    updateAccounts,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/gtm/entities'
  );

  if (errorModal) return errorModal;


  const renderForms = () => {
    const currentFormIndex = currentStep - 1; // Adjust for zero-based indexing
    // Use the currentFormIndex directly for the form values

    // Check if the current form index is within the bounds of the fields array
    if (currentFormIndex < 0 || currentFormIndex >= fields.length) {
      return null; // Return null or some fallback UI if out of bounds
    }

    // Get the field for the current form step
    const field = fields[currentFormIndex];

    const currentPropertyName =
      formDataDefaults[currentFormIndex]?.name || `Account ${currentFormIndex}`;

    return (
      <div className="w-full">
        <div
          key={field.id} // Adjust key indexing to match current step
          className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        >
          <div className="max-w-xl mx-auto">
            {/* Display the current property name */}
            <h1>{currentPropertyName}</h1>
            <div className="mt-12">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  id="updateProperty"
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

FormUpdateAccount.displayName = 'FormUpdateAccount';

export default FormUpdateAccount;