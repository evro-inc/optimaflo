'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { FormSchema, FormSetType, UserPermissionType } from '@/src/lib/schemas/gtm/userPermissions';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import {
  AccountPermission,
  ContainerPermission,
  FormCreateProps,
  Permissions,
} from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createPermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import EmailForm from '../components/email';
import EntitySelect from '../components/entitySelection';

const defaultUserPermission: UserPermissionType = {
  accountId: '',
  accountAccess: { permission: AccountPermission.UNSPECIFIED },
  containerAccess: [{ containerId: '', permission: ContainerPermission.UNSPECIFIED }],
};

const FormCreatePermission: React.FC<FormCreateProps> = React.memo(
  ({ tierLimits, containers = [], table = [], type }) => {
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

    const remainingCreateData = calculateRemainingLimit(
      tierLimits || [],
      'GTMPermissions',
      'create'
    );
    const remainingCreate = remainingCreateData.remaining;

    const configs = gtmFormFieldConfigs('GTMPermissions', 'create', remainingCreate);

    const formDataDefaults: Permissions[] = [
      {
        permissions: [defaultUserPermission],
      },
    ];

    const { formAmount, form, fields, addForm, count } = useFormInitialization<Permissions>(
      formDataDefaults,
      FormSchema
    );

    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['permissions', 'emailAddresses'],
    });

    const onSubmit: SubmitHandler<FormSetType> = processForm(
      createPermissions,
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
      return (
        <div className="w-full">
          {fields.length >= currentStep - 1 && (
            <div
              key={fields[currentStep - 2].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>Container {currentStep - 1}</h1>
                <div className="mt-12">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      id="createContainer"
                      className="space-y-6"
                    >
                      {Object.entries(configs)
                        .filter(([key]) => key !== 'amount')
                        .map(([key, config]) => {
                          // Handle custom fields separately
                          if (key === 'emailAddresses') {
                            return (
                              <EmailForm key={key} formIndex={currentStep - 2} type="create" />
                            );
                          } else if (key === 'entitySelection') {
                            return (
                              <EntitySelect
                                key={key}
                                formIndex={currentStep - 2}
                                accountsWithContainers={table}
                                containers={containers}
                                table={table}
                                type="create"
                              />
                            );
                          } else {
                            // Handle standard fields with FormFieldComponent
                            return (
                              <FormFieldComponent
                                key={key}
                                name={`forms.${currentStep - 2}.${key}`}
                                label={config.label}
                                description={config.description}
                                placeholder={config.placeholder}
                                type={config.type}
                                options={config.options}
                              />
                            );
                          }
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
    };

    return (
      <div className="flex items-center justify-center h-screen">
        {currentStep === 1 ? renderStepOne() : renderStepForms()}
      </div>
    );

    /* 
    return (
      <div className="flex items-center justify-center h-screen">
  
  
        {currentStep > 1 && (
          <div className="w-full">
            {formFields.length >= currentStep - 1 && (
              <div
                key={formFields[currentStep - 2].id}
                className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
              >
                <div className="max-w-xl mx-auto">
                  <div className="mt-12">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(processForm)}
                        id="createPermission"
                        className="space-y-6"
                      >
                        {formFields.length > 0 &&
                          formFields.map((field, index) => (
                            <div
                              key={field.id}
                              className={`space-y-4 ${currentStep - 2 !== index ? 'hidden' : ''}`}
                            >
                              <h3>Permission {currentStep - 1}</h3>
                              <EmailAddressField formIndex={currentStep - 2} type={'create'} />
                              <EntitySelection
                                accountsWithContainers={table}
                                containers={containers}
                                formIndex={currentStep - 2}
                              />
                            </div>
                          ))}
  
                        <div className="flex justify-between">
                          <Button type="button" onClick={handlePrevious}>
                            Previous
                          </Button>
                          {currentStep - 1 < formFields.length ? (
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
  }
);

FormCreatePermission.displayName = 'FormCreatePermission';

export default FormCreatePermission;
