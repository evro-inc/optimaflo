'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { FormUpdateProps, GA4StreamType } from '@/src/types/types';
import { updateGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { DataStreamType, FormSchema } from '@/src/lib/schemas/ga/streams';
import { gaFormFieldConfigs } from '@/src/utils/gaFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormUpdateStream: React.FC<FormUpdateProps> = React.memo(({ tierLimits }) => {
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

  console.log('selectedRowData', selectedRowData);

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GA4Streams', 'update');
  const remainingUpdate = remainingUpdateData.remaining;

  useErrorRedirect(selectedRowData, router, '/dashboard/ga/properties');

  const selectedRowDataTransformed: Record<string, GA4StreamType> = Object.fromEntries(
    Object.entries(selectedRowData).map(([key, row]) => [
      key,
      {
        account: row.accountName,
        property: row.parent,
        displayName: row.displayName,
        parentURL: row.name,
        type: row.type,
        webStreamData: {
          defaultUri: row.webStreamData.defaultUri,
        },
        androidAppStreamData: {
          packageName: '',
        },
        iosAppStreamData: {
          bundleId: '',
        },
        name: row.name,
        accountId: row.accountId,
        parent: row.parent,
      } as GA4StreamType,
    ])
  );

  const formDataDefaults: GA4StreamType[] = Object.values(selectedRowData).map((row) => ({
    account: row.accountName,
    property: row.parent,
    displayName: row.displayName,
    parentURL: row.name,
    type: row.type,
    webStreamData: {
      defaultUri: row.webStreamData.defaultUri,
    },
    androidAppStreamData: {
      packageName: '',
    },
    iosAppStreamData: {
      bundleId: '',
    },
    name: row.name,
    accountId: row.accountId,
    parent: row.parent,
  }));

  const { form, fields } = useFormInitialization<GA4StreamType>(formDataDefaults, FormSchema);

  const currentIndex = Math.max(0, currentStep - 2);
  const selectedStreamType = useWatch({
    control: form.control,
    name: `forms.${currentIndex}.type`,
  });

  const configs = gaFormFieldConfigs(
    'GA4Streams',
    'update',
    remainingUpdate,
    selectedRowDataTransformed,
    selectedStreamType
  );

  console.log('configs', configs);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: [
      'displayName',
      'webStreamData.defaultUri',
      'androidAppStreamData.packageName',
      'iosAppStreamData.bundleId',
    ],
  });

  const onSubmit: SubmitHandler<DataStreamType> = processForm(
    updateGAPropertyStreams,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/ga/properties'
  );

  if (errorModal) return errorModal;

  const renderForms = () => {
    const currentFormIndex = currentStep - 1; // Adjust for zero-based indexing

    // Check if the current form index is within the bounds of the fields array
    if (currentFormIndex < 0 || currentFormIndex >= fields.length) {
      return null; // Return null or some fallback UI if out of bounds
    }

    // Get the field for the current form step
    const field = fields[currentFormIndex];
    const currentPropertyName =
      formDataDefaults[currentFormIndex]?.displayName || `Property ${currentFormIndex}`;

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
                        name={`forms.${currentStep - 1}.${key}`} // Ensure correct form name mapping
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

FormUpdateStream.displayName = 'FormUpdateStream';

export default FormUpdateStream;
