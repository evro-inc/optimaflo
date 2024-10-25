'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { FormSchema, FormSetType } from '@/src/lib/schemas/gtm/userPermissions';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import {
  AccountPermission,
  ContainerPermission,
  FormUpdateProps,
  Permissions,
} from '@/src/types/types';
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
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import EmailForm from '../components/email';
import EntitySelect from '../components/entitySelection';
import { updatePermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';

const FormUpdatePermission: React.FC<FormUpdateProps> = React.memo(
  ({ tierLimits, containers = [], table = [] }) => {
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

    const remainingUpdateData = calculateRemainingLimit(
      tierLimits || [],
      'GTMPermissions',
      'update'
    );
    const remainingUpdate = remainingUpdateData.remaining;

    useErrorRedirect(selectedRowData, router, '/dashboard/gtm/entities');

    const selectedRowDataTransformed: Permissions[] = Object.values(selectedRowData).map(
      (rowData) => {
        let containerAccessArray: any = [];

        if (Array.isArray(rowData.containerAccess)) {
          // If `containerAccess` is already an array, map it.
          containerAccessArray = rowData.containerAccess.map((container) => ({
            containerId: container.containerId || '', // Make sure containerId is a string
            permission: container.permission || ContainerPermission.UNSPECIFIED,
          }));
        } else if (rowData.containerAccess && typeof rowData.containerAccess === 'object') {
          // If `containerAccess` is a single object, wrap it in an array
          containerAccessArray = [
            {
              containerId: rowData.containerAccess.containerId || '', // Make sure containerId is a string
              permission: rowData.containerAccess.permission || ContainerPermission.UNSPECIFIED,
            },
          ];
        }

        return {
          emailAddresses: [{ emailAddress: rowData.emailAddress }],
          permissions: [
            {
              path: rowData.path,
              accountId: rowData.accountId || '', // Make sure accountId is a string
              accountAccess: rowData.accountAccess || { permission: AccountPermission.UNSPECIFIED },
              containerAccess: containerAccessArray,
            },
          ],
        };
      }
    );

    const configs = gtmFormFieldConfigs(
      'GTMPermissions',
      'update',
      remainingUpdate,
      selectedRowDataTransformed
    );

    const { form, fields } = useFormInitialization<Permissions>(
      selectedRowDataTransformed,
      FormSchema
    );

    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['permissions', 'emailAddresses'],
    });

    const onSubmit: SubmitHandler<FormSetType> = processForm(
      updatePermissions,
      form.getValues(),
      () => form.reset({ forms: selectedRowDataTransformed }),
      dispatch,
      router,
      '/dashboard/gtm/entities'
    );

    if (Object.keys(selectedRowData).length === 0) {
      // Redirect to the entities page
      router.push('/dashboard/gtm/entities');
      return null;
    }

    if (errorModal) return errorModal;

    const renderForms = () => {
      // Calculate the index for the current form to display
      const currentFormIndex = currentStep - 1; // Adjust for 0-based index

      // Check if the current form index is within the bounds of the fields array
      if (currentFormIndex < 0 || currentFormIndex >= fields.length) {
        return null; // Return null or some fallback UI if out of bounds
      }

      // Get the field for the current form step
      const field = fields[currentFormIndex];

      // Get the rowData for the current form
      const selectedRowDataValues = Object.values(selectedRowData);
      const rowData = selectedRowDataValues[currentFormIndex];

      // Extract emailAddress and permissions from rowData if needed
      const emailAddress = Array.isArray(rowData.emailAddress)
        ? rowData.emailAddress
        : [rowData.emailAddress];

      return (
        <div className="w-full">
          {/* Render only the form corresponding to the current step */}
          <div
            key={field.id} // Use field.id here for unique key
            className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
          >
            <div className="max-w-xl mx-auto">
              {/* Display the current property name */}
              <h1>test</h1>
              <div className="mt-12">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    id="updateProperty"
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
                              formIndex={currentFormIndex}
                              type="update"
                              table={emailAddress}
                            />
                          );
                        } else if (key === 'entitySelection') {
                          return (
                            <EntitySelect
                              key={key}
                              formIndex={currentFormIndex}
                              accountsWithContainers={table}
                              containers={containers}
                              table={table}
                              type="update"
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
  }
);

FormUpdatePermission.displayName = 'FormUpdatePermission';

export default FormUpdatePermission;
