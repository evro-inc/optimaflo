'use client';

import { Button } from '@/src/components/ui/button';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import { PlusIcon, MinusIcon } from '@radix-ui/react-icons';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

export default function AccountContainerWorkspaceRow({
  accounts,
  containers,
  workspaces,
  formIndex,
}) {
  const { control, setValue, getValues } = useFormContext();

  console.log('accounts', accounts);
  console.log('containers', containers);
  console.log('workspaces', workspaces);

  // Use useFieldArray for dynamic accountContainerWorkspace rows
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.accountContainerWorkspace`,
  });

  // Ensure at least one row is always present
  useEffect(() => {
    if (!fields.length) {
      append({ accountId: '', containerId: '', workspaceId: '' });
    }
  }, [fields, append]);

  return (
    <div className="flex flex-col space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Account, Container, and Workspace Selection</h3>
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
          <div className="flex items-center space-x-4 pb-5" key={item.id}>
            {/* Account ID Select */}
            <FormFieldComponent
              name={`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.accountId`}
              label="Account"
              description="Select an account"
              placeholder="Account ID"
              type="select"
              options={accounts.map((account) => ({
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

            {/* Container ID Select */}
            <FormFieldComponent
              name={`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.containerId`}
              label="Container"
              description="Select a container"
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

            {/* Workspace ID Select */}
            <FormFieldComponent
              name={`forms.${formIndex}.accountContainerWorkspace.${entityIndex}.workspaceId`}
              label="Workspace"
              description="Select a workspace"
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

            {/* Remove Button */}
            <Button type="button" onClick={() => remove(entityIndex)}>
              <MinusIcon />
            </Button>
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
