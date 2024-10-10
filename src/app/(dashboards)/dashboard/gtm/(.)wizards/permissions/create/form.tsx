'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount, setCurrentStep } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
  FormCreateAmountSchema,
  FormSchema,
  FormSetType,
  FormValuesType,
  TransformedFormSchema,
  UserPermissionType,
} from '@/src/lib/schemas/gtm/userPermissions';
import { Button } from '@/src/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  AccountPermission,
  ContainerPermission,
  FeatureResponse,
  FormCreateProps,
  Permissions
} from '@/src/types/types';
import { toast } from 'sonner';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createPermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';
import EmailAddressField from '../components/email';
import EntitySelection from '../components/entitySelection';
import { addForm } from '@/src/redux/gtm/userPermissionSlice';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import EmailForm from '../components/email';
import EntitySelect from '../components/entitySelection';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const ErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/Error').then((mod) => mod.ErrorMessage),
  { ssr: false }
);

const defaultUserPermission: UserPermissionType = {
  accountId: '',
  emailAddress: '',
  accountAccess: { permission: AccountPermission.UNSPECIFIED },
  containerAccess: [{ containerId: '', permission: ContainerPermission.UNSPECIFIED }],
};

const FormCreatePermission: React.FC<FormCreateProps> = React.memo(({
  tierLimits,
  containers = [],
  table = [],
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

  const remainingCreateData = calculateRemainingLimit(tierLimits || [], 'GTMPermissions', 'create');
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
                            <EmailForm
                              key={key}
                              formIndex={currentStep - 2}
                              type="create"
                            />
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

  console.log('errors', form.formState.errors);



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


});

FormCreatePermission.displayName = 'FormCreatePermission';

export default FormCreatePermission;
