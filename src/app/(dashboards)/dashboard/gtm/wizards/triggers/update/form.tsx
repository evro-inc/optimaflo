'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler, useWatch } from 'react-hook-form';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { FormUpdateProps, Trigger } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { FormSchema, TriggerType } from '@/src/lib/schemas/gtm/triggers';
import { updateTriggers } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';
import LinkClickTrigger from '../components/linkClick';
import VisTrigger from '../components/vis';
import ScrollDepthTrigger from '../components/scroll';
import YouTubeTrigger from '../components/youTube';
import CustomEventTrigger from '../components/customEvent';
import TimerTrigger from '../components/timer';
import TriggerGroup from '../components/triggerGroup';
import FiringOnTrigger from '../components/firesOnTrigger';
import {
  useErrorHandling,
  useErrorRedirect,
  useFormInitialization,
  useStepNavigation,
} from '@/src/hooks/wizard';
import { calculateRemainingLimit, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import FormatValue from '../../variables/components/formatValue';

const FormUpdateTriggers: React.FC<FormUpdateProps> = React.memo(({ table, tierLimits }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const errorModal = useErrorHandling(error, notFoundError);
  const currentFormIndex = currentStep - 1;

  useEffect(() => {
    // Ensure that we reset to the first step when the component mounts
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  const selectedRowData = useSelector((state: RootState) => state.table.selectedRows);
  const remainingUpdateData = calculateRemainingLimit(tierLimits || [], 'GTMTriggers', 'update');
  const remainingUpdate = remainingUpdateData.remaining;
  useErrorRedirect(selectedRowData, router, '/dashboard/gtm/configurations');

  const formDataDefaults: Trigger[] = Object.values(selectedRowData).map((rowData) => ({
    accountContainerWorkspace: [
      {
        accountId: rowData.accountId,
        containerId: rowData.containerId,
        workspaceId: rowData.workspaceId,
        triggerId: rowData.triggerId,
      },
    ],
    name: rowData.name,
    type: rowData.type,
    parameter: rowData.parameter || [],
    formatValue: { caseConversionType: 'none' },
  }));

  const configs = gtmFormFieldConfigs('GTMTriggers', 'update', remainingUpdate, formDataDefaults);

  const { form, fields } = useFormInitialization<Trigger>(formDataDefaults, FormSchema);

  const { handleNext, handlePrevious } = useStepNavigation({
    form,
    currentStep,
    fieldsToValidate: ['type', 'accountContainerWorkspace'],
  });

  const onSubmit: SubmitHandler<TriggerType> = processForm(
    updateTriggers,
    form.getValues(),
    () => form.reset({ forms: formDataDefaults }),
    dispatch,
    router,
    '/dashboard/gtm/configurations'
  );

  const selectedType = useWatch({
    control: form.control,
    name: `forms.${currentFormIndex}.type`,
  });

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

  /*   useEffect(() => {
      formDataDefaults.forEach((data, index) => {
        form.setValue(`forms.${index}.accountId`, data.accountId);
        form.setValue(`forms.${index}.containerId`, data.containerId);
        form.setValue(`forms.${index}.workspaceId`, data.workspaceId);
        form.setValue(`forms.${index}.triggerId`, data.triggerId);
      });
    }, [form, formDataDefaults]); */

  /*   return (
      <div className="flex items-center justify-center h-screen">
  
        {currentStep && (
          <div className="w-full">
            {fields.length > 0 && fields.length >= currentStep && (
              <div
                key={fields[currentFormIndex].id}
                className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
              >
                <div className="max-w-xl mx-auto">
                  <h1>{fields[currentFormIndex]?.name}</h1>
                  <div className="mt-12">
  
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(processForm)}
                        id={`createVar-${currentFormIndex}`}
                        className="space-y-6"
                      >
                        <div>
                          <FormField
                            control={form.control}
                            name={`forms.${currentFormIndex}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Trigger Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Name of Trigger"
                                    {...form.register(`forms.${currentFormIndex}.name`)}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div>
                          <FormField
                            control={form.control}
                            name={`forms.${currentFormIndex}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Trigger Type</FormLabel>
                                <FormDescription>
                                  This is the trigger type you want to create.
                                </FormDescription>
                                <FormControl>
                                  <Select
                                    {...form.register(`forms.${currentFormIndex}.type`)}
                                    {...field}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a trigger type." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>Trigger Type</SelectLabel>
                                        {triggerTypeArray.map((trigger) => (
                                          <SelectItem key={trigger.type} value={trigger.type}>
                                            {trigger.name}
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
                        </div>
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
                                return <LinkClickTrigger formIndex={currentFormIndex} />;
                              case 'elementVisibility':
                                return <VisTrigger formIndex={currentFormIndex} />;
                              case 'formSubmission':
                                return <LinkClickTrigger formIndex={currentFormIndex} />;
                              case 'scrollDepth':
                                return <ScrollDepthTrigger formIndex={currentFormIndex} />;
                              case 'youTubeVideo':
                                return <YouTubeTrigger formIndex={currentFormIndex} />;
                              case 'customEvent':
                                return <CustomEventTrigger formIndex={currentFormIndex} />;
                              case 'historyChange':
                                return null;
                              case 'jsError':
                                return null;
                              case 'timer':
                                return <TimerTrigger formIndex={currentFormIndex} />;
                              case 'triggerGroup':
                                return <TriggerGroup formIndex={currentFormIndex} table={data} />;
                              default:
                                return <div>Unknown Trigger Type</div>;
                            }
                          })()}
  
                        <FiringOnTrigger formIndex={currentFormIndex} />
  
                        <div className="flex justify-between">
                          <Button type="button" onClick={handlePrevious}>
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

FormUpdateTriggers.displayName = 'FormUpdateTriggers';
export default FormUpdateTriggers;
