'use client';

import { Button } from '@/src/components/ui/button';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { PlusIcon, MinusIcon } from '@radix-ui/react-icons';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormDescription, FormLabel } from '@/src/components/ui/form';

export default function AccountContainerWorkspaceRow({
  accounts,
  containers,
  workspaces,
  formIndex,
}) {
  const { control, setValue, getValues } = useFormContext();

  // Use useFieldArray for dynamic accountContainerWorkspace rows
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.accountContainerWorkspace`,
  });

  // Watching changes to dynamically reset related fields
  const watchedAccounts = useWatch({
    control,
    name: `forms.${formIndex}.accountContainerWorkspace`,
  });

  // Ensure at least one row is always present
  useEffect(() => {
    if (!fields.length) {
      append({ accountId: '', containerId: '', workspaceId: '' });
    }
  }, [fields, append]);

  // This effect will reset container and workspace when account changes
  useEffect(() => {
    if (Array.isArray(watchedAccounts) && watchedAccounts.length > 0) {
      watchedAccounts.forEach((watchedEntity, entityIndex) => {
        if (watchedEntity.accountId !== '') {
          const currentAccountId = getValues(
            `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.accountId`
          );

          if (currentAccountId && currentAccountId !== watchedEntity.accountId) {
            // Reset containerId and workspaceId if accountId changes
            setValue(`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.containerId`, '');
            setValue(`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.workspaceId`, '');
          }
        }
      });
    }
  }, [watchedAccounts, formIndex, setValue, getValues]);

  const accountsWithContainers = accounts.filter((account) =>
    containers.some((container) => container.accountId === account.accountId)
  );

  return (
    <div className="flex flex-col">
      {/* Headings Row */}
      <div className="flex items-center space-x-4 pb-2 font-semibold">
        <div className="w-48">
          <FormLabel>Account</FormLabel>
          <FormDescription>Select an account</FormDescription>
        </div>
        <div className="w-48">
          <FormLabel>Container</FormLabel>
          <FormDescription>Select an container</FormDescription>
        </div>
        <div className="w-48">
          <FormLabel>Workspace</FormLabel>
          <FormDescription>Select an workspace</FormDescription>
        </div>
      </div>
      {fields.map((item, entityIndex) => {
        // Fetching current values to filter options
        const currentAccountId = getValues(
          `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.accountId`
        );
        const currentContainerId = getValues(
          `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.containerId`
        );

        // Filter containers and workspaces based on previous selections
        const availableContainers = containers.filter(
          (container) => container.accountId === currentAccountId
        );
        const availableWorkspaces = workspaces.filter(
          (workspace) => workspace.containerId === currentContainerId
        );

        return (
          <div className="flex items-center space-x-4" key={item.id}>
            {/* Account ID Select */}
            <div className="w-48">
              <FormFieldComponent
                name={`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.accountId`}
                label=""
                description=""
                placeholder="Account ID"
                type="select"
                options={accountsWithContainers.map((account) => ({
                  label: account.name,
                  value: account.accountId,
                }))}
                onChange={(value) => {
                  setValue(
                    `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.accountId`,
                    value
                  );
                  setValue(
                    `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.containerId`,
                    ''
                  );
                  setValue(
                    `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.workspaceId`,
                    ''
                  );
                }}
              />
            </div>

            {/* Container ID Select */}
            <div className="w-48">
              <FormFieldComponent
                name={`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.containerId`}
                label=""
                description=""
                placeholder="Container ID"
                type="select"
                options={availableContainers.map((container) => ({
                  label: container.name,
                  value: container.containerId,
                }))}
                disabled={!currentAccountId}
                onChange={(value) => {
                  setValue(
                    `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.containerId`,
                    value
                  );
                  setValue(
                    `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.workspaceId`,
                    ''
                  );
                }}
              />
            </div>

            {/* Workspace ID Select */}
            <div className="w-48">
              <FormFieldComponent
                name={`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.workspaceId`}
                label=""
                description=""
                placeholder="Workspace ID"
                type="select"
                options={availableWorkspaces.map((workspace) => ({
                  label: workspace.name,
                  value: workspace.workspaceId,
                }))}
                disabled={!currentContainerId}
                onChange={(value) => {
                  setValue(
                    `forms.${formIndex}.accountContainerWorkspace.${entityIndex}.workspaceId`,
                    value
                  );
                }}
              />
            </div>

            <div className="pt-2">
              <Button type="button" onClick={() => remove(entityIndex)}>
                <MinusIcon />
              </Button>
            </div>
          </div>
        );
      })}

      {/* Add Button */}
      <Button
        className="mt-4"
        type="button"
        onClick={() => append({ accountId: '', containerId: '', workspaceId: '' })}
      >
        <PlusIcon /> Add Row
      </Button>
    </div>
  );
}
