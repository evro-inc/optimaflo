'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';

import { FormUpdateProps, Tag } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { FormSchema, TagType } from '@/src/lib/schemas/gtm/tags';
import { updateTags } from '@/src/lib/fetch/dashboard/actions/gtm/tags';
import ConfigTag from '../components/configTag';
import EventTag from '../components/eventTag';
import FiringTriggerComponent from '../components/firingTrigger';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormUpdateTags: React.FC<FormUpdateProps> = React.memo(({ table, tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const currentFormIndex = currentStep - 1; // Adjust for 0-based index

  useEffect(() => {
    // Ensure that we reset to the first step when the component mounts
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GTMTags', 'update');
  const remainingUpdate = remainingUpdateData.remaining;
  useErrorRedirect(selectedRowData, router, '/dashboard/gtm/configurations');

  if (Object.keys(selectedRowData).length === 0) {
    router.push('/dashboard/gtm/configurations');
  }

  const formDataDefaults: Tag[] = Object.values(selectedRowData).map((rowData) => ({
    accountContainerWorkspace: [
      {
        accountId: rowData.accountId,
        containerId: rowData.containerId,
        workspaceId: rowData.workspaceId,
        tagId: rowData.tagId,
      },
    ],
    name: rowData.name || '',
    type: rowData.type || 'googtag',
    parameter: rowData.parameter || [],
    firingTriggerId: rowData.firingTriggerId || ['2147479553'], // Ensure firingTriggerId is included here
    tagFiringOption: rowData.tagFiringOption || 'oncePerEvent',
    monitoringMetadata: rowData.monitoringMetadata || {
      type: 'map',
      key: '',
      value: '',
    },
    consentSettings: {
      consentStatus: 'notSet',
      consentType: {
        type: 'list',
        key: '',
        value: '',
        list: [],
        map: [],
        isWeakReference: false,
      },
    },
    path: rowData.path || '',
    firingRuleId: rowData.firingRuleId || [],
    blockingRuleId: rowData.blockingRuleId || [],
    liveOnly: rowData.liveOnly || false,
    priority: rowData.priority || {
      type: 'integer',
      value: '0',
      key: '',
    },
    notes: rowData.notes || '',
    scheduleStartMs: rowData.scheduleStartMs ? Number(rowData.scheduleStartMs) : 0,
    scheduleEndMs: rowData.scheduleEndMs ? Number(rowData.scheduleEndMs) : 0,
    fingerprint: rowData.fingerprint || '',
    blockingTriggerId: rowData.blockingTriggerId || [],
    parentFolderId: rowData.parentFolderId || '',
    tagManagerUrl: rowData.tagManagerUrl || '',
    paused: rowData.paused || false,
    monitoringMetadataTagNameKey: rowData.monitoringMetadataTagNameKey || '',
  }));

  const configs = gtmFormFieldConfigs('GTMTags', 'update', remainingUpdate, formDataDefaults);

  const { form, fields } = useFormInitialization<Tag>(formDataDefaults, FormSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['type', 'name'],
  });

  const selectedType = useWatch({
    control: form.control,
    name: `forms.${currentFormIndex}.type`,
  });

  const onSubmit: SubmitHandler<TagType> = processForm(
    updateTags,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/gtm/configurations'
  );

  if (Object.keys(selectedRowData).length === 0) {
    // Redirect to the entities page
    router.push('/dashboard/gtm/configurations');
    return null;
  }

  if (errorModal) return errorModal;

  const renderForms = () => {
    // Calculate the index for the current form to display
    // Adjust for 0-based index

    // Check if the current form index is within the bounds of the fields array
    if (currentFormIndex < 0 || currentFormIndex >= fields.length) {
      return null; // Return null or some fallback UI if out of bounds
    }

    // Get the field for the current form step
    const field = fields[currentFormIndex];

    // Use the currentPropertyIndex directly for the form values
    const currentPropertyName = formDataDefaults[currentFormIndex]?.name;

    return (
      <div className="w-full">
        {/* Render only the form corresponding to the current step */}
        <div
          key={field.id} // Use field.id here for unique key
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
                    .filter(
                      ([key]) =>
                        key !== 'accountId' && key !== 'containerId' && key !== 'workspaceId'
                    )
                    .map(([key, config]) => {
                      return (
                        <FormFieldComponent
                          key={key}
                          name={`forms.${currentFormIndex}.${key}`}
                          label={config.label}
                          description={config.description}
                          placeholder={config.placeholder}
                          type={config.type}
                          options={config.options}
                        />
                      );
                    })}
                  {selectedType &&
                    (() => {
                      switch (selectedType) {
                        case 'googtag':
                          return <ConfigTag formIndex={currentFormIndex} table={table} />;
                        case 'gaawe':
                          return <EventTag formIndex={currentFormIndex} table={table} />;
                        case 'html':
                          return null;
                        case 'gclidw':
                          return null;
                        default:
                          return <div>Unknown Trigger Type</div>;
                      }
                    })()}

                  <FiringTriggerComponent formIndex={currentFormIndex} />

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
      </div>
    );
  };

  return <div className="flex items-center justify-center h-screen">{renderForms()}</div>;
});

FormUpdateTags.displayName = 'FormUpdateTags';

export default FormUpdateTags;
