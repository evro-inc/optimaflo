'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { FormSchemaType, FormsSchema } from '@/src/lib/schemas/ga/properties';
import { Button } from '@/src/components/ui/button';
import { FormUpdateProps, GA4PropertyType } from '@/src/types/types';
import { updateProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { formFieldConfigs } from '@/src/utils/formFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { Form } from '@/src/components/ui/form';

const FormUpdateProperty: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
  // Destructure tierLimits from FormUpdateProps
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GA4Properties', 'update');
  const remainingUpdate = remainingUpdateData.remaining;

  console.log('selectedRowData', selectedRowData.length);

  useEffect(() => {
    if (Object.keys(selectedRowData).length === 0) {
      router.push('/dashboard/ga/properties'); // Replace with your redirect path
    }
  }, [selectedRowData, router]);

  const selectedRowDataTransformed: Record<string, GA4PropertyType> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, row]) => [
      key,
      {
        name: row.name,
        parent: row.parent,
        displayName: row.displayName,
        timeZone: row.timeZone,
        currencyCode: row.currencyCode,
        serviceLevel: row.serviceLevel,
        propertyType: row.propertyType,
        industryCategory: row.industryCategory,
        retention: row.retention,
        resetOnNewActivity: row.resetOnNewActivity,
        acknowledgment: row.acknowledgment,
      } as GA4PropertyType,
    ])
  );

  const configs = formFieldConfigs('update', remainingUpdate, selectedRowDataTransformed);

  const formDataDefaults: GA4PropertyType[] = Object.values(selectedRowData).map((rowData) => ({
    name: rowData.displayName,
    parent: rowData.name,
    currencyCode: rowData.currencyCode,
    displayName: rowData.displayName,
    industryCategory: rowData.industryCategory,
    timeZone: rowData.timeZone,
    propertyType: rowData.propertyType,
    retention: rowData.retention,
    resetOnNewActivity: rowData.resetOnNewActivity,
    acknowledgment: rowData.acknowledgment,
  }));

  const { form, fields } = useFormInitialization(formDataDefaults, FormsSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['displayName', 'parent', 'currencyCode', 'timeZone', 'industryCategory'],
  });

  const onSubmit: SubmitHandler<FormSchemaType> = processForm(
    updateProperties,
    formDataDefaults,
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/ga/properties'
  );

  if (errorModal) return errorModal;

  return (
    <div className="flex items-center justify-center h-screen">
      {/* Conditional rendering based on the currentStep */}

      {currentStep && (
        <div className="w-full">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length > 0 && fields.length >= currentStep && (
            <div
              key={fields[currentFormIndex].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-full mx-auto">
                <h1>{fields[currentFormIndex]?.displayName}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      id={`updateProperty-${currentFormIndex}`}
                      className="space-y-6"
                    >
                      {fields.length > 0 &&
                        fields.map((field, index) => {
                          if (index === currentFormIndex) {
                            return (
                              <>
                                <FormFieldComponent
                                  name={`forms.${currentFormIndex}.displayName`}
                                  {...configs.displayName}
                                />

                                <FormFieldComponent
                                  name={`forms.${currentFormIndex}.currencyCode`}
                                  {...configs.currencyCode}
                                />

                                <FormFieldComponent
                                  name={`forms.${currentFormIndex}.timeZone`}
                                  {...configs.timeZone}
                                />

                                <FormFieldComponent
                                  name={`forms.${currentFormIndex}.industryCategory`}
                                  {...configs.industryCategory}
                                />

                                <FormFieldComponent
                                  name={`forms.${currentFormIndex}.retention`}
                                  {...configs.retention}
                                />

                                <FormFieldComponent
                                  name={`forms.${currentFormIndex}.resetOnNewActivity`}
                                  {...configs.resetOnNewActivity}
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

                  {/* End Form */}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FormUpdateProperty.displayName = 'FormUpdateProperty';

export default FormUpdateProperty;
