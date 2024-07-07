'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
  FormCreateAmountSchema,
  FormSchema,
  FormValuesType,
  UserPermissionSchema,
  TransformedFormSchema,
  UserPermissionType,
} from '@/src/lib/schemas/gtm/userPermissions';
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
import {
  AccountPermission,
  ContainerPermission,
  FeatureResponse,
  FormCreateProps,
  UserPermission,
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
import { CreatePermissions, UpdatePermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';
import {
  accountAccessPermissions,
  containerAccessPermissions,
} from '../../../entities/@permissions/items';
import EmailForm from '../components/email';
import EntitySelection from '../components/entitySelection';
import Email from '../components/email';
import { addForm } from '@/src/redux/gtm/userPermissionSlice';

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

const FormUpdatePermissions: React.FC<FormCreateProps> = ({
  tierLimits,
  accounts = [],
  containers = [],
  table = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const propertyCount = useSelector((state: RootState) => state.form.count);
  const forms = useSelector((state: RootState) => state.gtmUserPermission.forms);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();
  const count = useSelector((state: RootState) => state.form.count);
  const emailAddresses = useSelector((state: RootState) =>
    state.gtmUserPermission.forms.flatMap((form) => form.emailAddresses)
  );


  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMPermissions'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  const form = useForm<FormValuesType>({
    defaultValues: {
      forms: [
        {
          emailAddresses: [{ emailAddress: '' }],
          permissions: [defaultUserPermission],
        },
      ],
    },
    /* resolver: zodResolver(FormSchema), */ // Client-side validation
  });

  const {
    fields: formFields,
    append: appendForm,
    remove: removeForm,
  } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  // Effect to update propertyCount when amount changes
  useEffect(() => {
    const amount = parseInt(formCreateAmount.getValues('amount').toString());
    dispatch(setCount(amount));

    // Ensure forms are initialized
    if (Array.isArray(forms)) {
      for (let i = 0; i < amount; i++) {
        if (!forms[i]) {
          dispatch(addForm());
        }
      }
    }
  }, [formCreateAmount.watch('amount'), dispatch, forms]);

  /*   if (notFoundError) {
      return <NotFoundErrorModal />;
    }
    if (error) {
      return <ErrorModal />;
    } */

  const handleAmountChange = (selectedAmount) => {
    const amount = parseInt(selectedAmount);
    form.reset({ forms: [] });
    for (let i = 0; i < amount; i++) {
      appendForm({
        emailAddresses: [{ emailAddress: '' }],
        permissions: [JSON.parse(JSON.stringify(defaultUserPermission))],
      });
    }
    dispatch(setCount(amount));

    // Ensure forms are initialized
    if (Array.isArray(forms)) {
      for (let i = 0; i < amount; i++) {
        if (!forms[i]) {
          dispatch(addForm());
        }
      }
    }
  };


  const transformData = (data: FormValuesType) => {
    const transformedForms = data.forms.flatMap((form) => {
      return form.emailAddresses.flatMap((emailObj) => {
        return form.permissions.map((permission) => ({
          ...permission,
          emailAddress: emailObj.emailAddress,
        }));
      });
    });
    return { forms: transformedForms };
  };

  const findPaths = (data, table) => {
    return data.forms.map(form => {
      return form.permissions.map(permission => {
        const emailAddress = form.emailAddresses[0].emailAddress;
        const accountId = permission.accountId;

        // Create a set to ensure unique paths
        const uniquePaths = new Set();

        const matches = table.filter(
          entry => entry.emailAddress === emailAddress && entry.accountId === accountId
        );

        matches.forEach(match => {
          uniquePaths.add(match.path);
        });

        return {
          ...permission,
          paths: Array.from(uniquePaths), // Convert the set back to an array
        };
      });
    });
  };




  const processForm: SubmitHandler<FormValuesType> = async (data) => {
    dispatch(setLoading(true));

    console.log("data", data);
    console.log('table data', table);


    const transformedData = transformData(data);
    console.log('transformedData', transformedData);


    const permissionsWithPaths = findPaths(data, table);
    const updatedTransformedData = {
      forms: transformedData.forms.map((form, index) => ({
        ...form,
        permissions: permissionsWithPaths[index],
      })),
    };


    const validation = TransformedFormSchema.safeParse(updatedTransformedData);
    if (!validation.success) {
      // Handle validation errors
      const errorMessages = validation.error.issues.map((issue) => {
        const field = issue.path.join('.');
        return `${field}: ${issue.message}`;
      });

      // Display each error message using toast.error
      errorMessages.forEach((message) => toast.error(message));

      dispatch(setLoading(false));
      return;
    }

    toast('Updating permissions...', {
      action: { label: 'Close', onClick: () => toast.dismiss() },
    });

    const uniquePermissions = new Set();
    data.forms.forEach((formSet) => {
      formSet.permissions.forEach((permission) => {
        formSet.emailAddresses.forEach((email) => {
          const identifier = `${permission.accountId}-${permission.accountAccess.permission}-${email.emailAddress}`;
          permission.containerAccess.forEach((container) => {
            const containerIdentifier = `${identifier}-${container.containerId}-${container.permission}`;
            if (uniquePermissions.has(containerIdentifier)) {
              toast.error(
                `Duplicate property found for ${permission.accountId} - ${permission.accountAccess.permission} - ${email.emailAddress}`,
                {
                  action: { label: 'Close', onClick: () => toast.dismiss() },
                }
              );
              dispatch(setLoading(false));
              return;
            }
            uniquePermissions.add(containerIdentifier);
          });
        });
      });
    });

    try {
      console.log("updatedTransformedData", updatedTransformedData);

      const res = (await UpdatePermissions(updatedTransformedData)) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Permission ${result.name} created successfully. The table will update shortly.`,
              {
                action: { label: 'Close', onClick: () => toast.dismiss() },
              }
            );
          }
        });
        router.push('/dashboard/gtm/entities');
      } else {
        handleErrors(res);
      }

      form.reset({
        forms: [{ permissions: [defaultUserPermission], emailAddresses: [{ emailAddress: '' }] }],
      });
    } catch (error) {
      toast.error('An unexpected error occurred.', {
        action: { label: 'Close', onClick: () => toast.dismiss() },
      });
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleErrors = (res: FeatureResponse) => {
    if (res.notFoundError) {
      res.results.forEach((result) => {
        if (result.notFound) {
          toast.error(
            `Unable to create permission ${result.name}. Please check your access permissions. Any other properties created were successful.`,
            {
              action: { label: 'Close', onClick: () => toast.dismiss() },
            }
          );
        }
      });
      dispatch(setErrorDetails(res.results));
      dispatch(setNotFoundError(true));
    }

    if (res.limitReached) {
      res.results.forEach((result) => {
        if (result.limitReached) {
          toast.error(
            `Unable to create permission ${result.name}. You have ${result.remaining} more permission(s) you can create.`,
            {
              action: { label: 'Close', onClick: () => toast.dismiss() },
            }
          );
        }
      });
      dispatch(setIsLimitReached(true));
    }

    if (res.errors) {
      res.errors.forEach((error) => {
        toast.error(`Unable to create permission. ${error}`, {
          action: { label: 'Close', onClick: () => toast.dismiss() },
        });
      });
      router.push('/dashboard/gtm/entities');
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Skip validation on the first step and directly increment the step
      dispatch(incrementStep());
      return;
    }

    const currentFormIndex = currentStep - 2;
    const emailAddressesField = `forms.${currentFormIndex}.emailAddresses` as const;
    const permissionsField = `forms.${currentFormIndex}.permissions` as const;

    const fieldsToValidate = [`${emailAddressesField}`, `${permissionsField}`] as const;

    // Validate only the current form fields
    const isFormValid = await form.trigger(fieldsToValidate);

    // Perform schema validation using the transformed data
    const transformedData = transformData({
      forms: [form.getValues(`forms.${currentFormIndex}`)],
    });
    const validation = TransformedFormSchema.safeParse(transformedData);

    if (!validation.success) {
      // Handle validation errors
      const errorMessages = validation.error.issues.map((issue) => {
        const field = issue.path.join('.');
        return `${field}: ${issue.message}`;
      });

      // Display each error message using toast.error
      errorMessages.forEach((message) => toast.error(message));

      dispatch(setLoading(false));
      return;
    }

    if (!isFormValid) {
      const emailAddressesErrors = form.getFieldState(emailAddressesField).error;
      const permissionsErrors = form.getFieldState(permissionsField).error;

      [emailAddressesErrors, permissionsErrors].forEach((error) => {
        if (error) {
          toast.error(`${error.ref?.name}: ${error.message}`);
        }
      });
      return;
    }

    dispatch(incrementStep());
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  console.log('form errors:', form.formState.errors);

  return (
    <div className="flex items-center justify-center h-screen">
      {/* Conditional rendering based on the currentStep */}
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-2/3 space-y-6">
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many permissions do you want to create?</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleAmountChange(value);
                    }}
                    defaultValue={propertyCount.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of properties you want to create." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: remainingCreate }, (_, i) => (
                        <SelectItem key={i} value={`${i + 1}`}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          </form>
        </Form>
      )}

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
                            <EmailForm formIndex={currentStep - 2} type={'update'} table={table} />
                            <EntitySelection
                              accountsWithContainers={accounts}
                              containers={containers}
                              formIndex={currentStep - 2}
                              table={table}
                              type={'update'}
                            />
                          </div>
                        ))}

                      {/*  <div key={formFields[currentStep - 2].id} className="space-y-4">
                                                <h3>Permission {currentStep - 1}</h3>
                                                <EmailForm formIndex={currentStep - 2} control={form.control} register={form.register} getValues={form.getValues} setValue={form.setValue} />
                                                <EntitySelection
                                                    accountsWithContainers={table}
                                                    containers={containers}
                                                    formIndex={currentStep - 2}
                                                />
                                            </div> */}

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
  );
};

export default FormUpdatePermissions;
