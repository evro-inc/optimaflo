'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { ContainerSchemaType, FormSchema } from '@/src/lib/schemas/gtm/containers';
import { Button } from '@/src/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

import { Input } from '@/src/components/ui/input';
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


const FormCreateContainer: React.FC<FormCreateProps> = ({ tierLimits, accounts = [] }) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const count = useSelector((state: RootState) => state.form.count);
  const errorModal = useErrorHandling(error, notFoundError);

  console.log('accounts', accounts);


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
      usageContext: [''],
      name: '',
      domainName: '',
      notes: '',
      containerId: '',
      publicId: '',
      accountName: '',
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

  console.log("form errors", form.formState.errors);


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

                  {/* End Form */}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormCreateContainer;
