'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { FormSchema, TriggerType } from '@/src/lib/schemas/gtm/triggers';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';

import { FormCreateGTMProps, Trigger } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createTriggers } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';
import FiringOnTrigger from '../components/firesOnTrigger';
import LinkClickTrigger from '../components/linkClick';
import VisTrigger from '../components/vis';
import ScrollDepthTrigger from '../components/scroll';
import YouTubeTrigger from '../components/youTube';
import CustomEventTrigger from '../components/customEvent';
import TimerTrigger from '../components/timer';
import TriggerGroup from '../components/triggerGroup';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import AccountContainerWorkspaceRow from '../../built-in-variables/components';
import FormatValue from '../../variables/components/formatValue';

const FormCreateTrigger: React.FC<FormCreateGTMProps> = ({
  tierLimits,
  accounts,
  containers,
  workspaces,
  table,
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

  const remainingCreateData = calculateRemainingLimit(tierLimits || [], 'GTMTriggers', 'create');
  const remainingCreate = remainingCreateData.remaining;

  const configs = gtmFormFieldConfigs('GTMTriggers', 'create', remainingCreate);

  const formDataDefaults: Trigger[] = [
    {
      accountContainerWorkspace: [
        {
          accountId: '',
          containerId: '',
          workspaceId: '',
        },
      ],
      name: '',
      type: 'pageview',
    },
  ];

  const { formAmount, form, fields, addForm, count } = useFormInitialization<Trigger>(
    formDataDefaults,
    FormSchema
  );

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['name', 'type'],
  });

  const onSubmit: SubmitHandler<TriggerType> = processForm(
    createTriggers,
    formDataDefaults,
    () => form.reset({ forms: [formDataDefaults] }),
    dispatch,
    router,
    '/dashboard/gtm/configurations'
  );

  const selectedType = useWatch({
    control: form.control,
    name: `forms.${currentStep - 2}.type`,
  });

  useEffect(() => {
    if (!selectedType) {
      form.setValue(`forms.${currentStep - 2}.type`, 'pageview');
    }
  }, [selectedType, form, currentStep]);

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
    // Render only the form corresponding to the current step - 2
    const formIndex = currentStep - 2;

    if (formIndex < 0 || formIndex >= fields.length) {
      return null; // Invalid step
    }

    const field = fields[formIndex];

    return (
      <div className="w-full">
        <div key={field.id} className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="max-w-xl mx-auto">
            <h1>Container {formIndex + 1}</h1>
            <div className="mt-12">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  id={`create-${formIndex}`}
                  className="space-y-6"
                >
                  {/* Render other form fields */}
                  {Object.entries(configs)
                    .filter(
                      ([key]) =>
                        key !== 'amount' &&
                        key !== 'accountId' &&
                        key !== 'containerId' &&
                        key !== 'workspaceId'
                    )
                    .map(([key, config]) => {
                      return (
                        <FormFieldComponent
                          key={key}
                          name={`forms.${formIndex}.${key}`}
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
                        case 'consentInit':
                          return null;
                        case 'init':
                          return null;
                        case 'pageview':
                          return null;
                        case 'domReady':
                          return null;
                        case 'windowLoaded':
                          return null;
                        case 'click':
                          return null;
                        case 'linkClick':
                          return <LinkClickTrigger formIndex={currentStep - 2} />;
                        case 'elementVisibility':
                          return <VisTrigger formIndex={currentStep - 2} />;
                        case 'formSubmission':
                          return <LinkClickTrigger formIndex={currentStep - 2} />;
                        case 'scrollDepth':
                          return <ScrollDepthTrigger formIndex={currentStep - 2} />;
                        case 'youTubeVideo':
                          return <YouTubeTrigger formIndex={currentStep - 2} />;
                        case 'customEvent':
                          return <CustomEventTrigger formIndex={currentStep - 2} />;
                        case 'historyChange':
                          return null;
                        case 'jsError':
                          return null;
                        case 'timer':
                          return <TimerTrigger formIndex={currentStep - 2} />;
                        case 'triggerGroup':
                          return <TriggerGroup formIndex={currentStep - 2} table={table} />;
                        default:
                          return <div>Unknown Trigger Type</div>;
                      }
                    })()}

                  <FiringOnTrigger formIndex={currentStep - 2} />

                  {selectedType !== 'ctv' &&
                    selectedType !== 'r' &&
                    selectedType !== 'gtcs' &&
                    selectedType !== 'gtes' &&
                    selectedType !== 'aev' && <FormatValue formIndex={currentStep - 2} />}

                  <AccountContainerWorkspaceRow
                    accounts={accounts}
                    containers={containers}
                    workspaces={workspaces}
                    formIndex={formIndex}
                  />

                  <div className="flex justify-between">
                    {currentStep > 1 && (
                      <Button type="button" onClick={handlePrevious}>
                        Previous
                      </Button>
                    )}
                    {formIndex < count - 1 ? (
                      <Button
                        type="button"
                        onClick={async () => {
                          const isValid = await form.trigger(`forms.${formIndex}`);
                          if (isValid) {
                            handleNext();
                          } else {
                            throw new Error('Error with validation');
                          }
                        }}
                      >
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
  return (
    <div className="flex items-center justify-center h-screen">
      {currentStep === 1 ? renderStepOne() : renderStepForms()}
    </div>
  );
};

export default FormCreateTrigger;
