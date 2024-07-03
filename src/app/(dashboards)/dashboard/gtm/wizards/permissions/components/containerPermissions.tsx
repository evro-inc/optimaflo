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
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { containerAccessPermissions } from '../../../entities/@permissions/items';

export const ContainerPermissions: React.FC<{
  formIndex: number;
  permissionIndex: number;
  table: any;
}> = ({ formIndex, permissionIndex, table }) => {
  const { setValue, getValues, control, register, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: control,
    name: `forms.${formIndex}.permissions.${permissionIndex}.containerAccess`,
  });

  const selectedContainerIds =
    useWatch({
      control,
      name: `forms.${formIndex}.permissions.${permissionIndex}.containerAccess`,
    })?.map((container) => container.containerId) || [];

  const selectedAccountId = useWatch({
    control,
    name: `forms.${formIndex}.permissions.${permissionIndex}.accountId`,
  });

  const filteredContainers = useMemo(() => {
    return table.filter((permission) => permission.accountId === selectedAccountId);
  }, [table, selectedAccountId]);

  const isAddContainerDisabled = useMemo(() => {
    return selectedContainerIds.length >= filteredContainers.length;
  }, [selectedContainerIds, filteredContainers]);

  return (
    <div className="flex flex-col">
      <FormLabel className="mb-3">Container ID and Permissions</FormLabel>
      {fields.map((field, containerIndex) => {
        const currentContainerId = getValues(
          `forms.${formIndex}.permissions.${permissionIndex}.containerAccess.${containerIndex}.containerId`
        );
        const availableContainers = filteredContainers.filter(
          (container) =>
            !selectedContainerIds.includes(container.containerId) ||
            container.containerId === currentContainerId
        );

        return (
          <div key={field.id} className="flex space-x-4 mb-3">
            <FormField
              control={control}
              name={`forms.${formIndex}.permissions.${permissionIndex}.containerAccess.${containerIndex}.containerId`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      {...register(
                        `forms.${formIndex}.permissions.${permissionIndex}.containerAccess.${containerIndex}.containerId`
                      )}
                      value={currentContainerId}
                      onValueChange={(value) => {
                        const newPermissions = [...getValues(`forms.${formIndex}.permissions`)];
                        newPermissions[permissionIndex] = {
                          ...newPermissions[permissionIndex],
                          containerAccess: newPermissions[permissionIndex].containerAccess.map(
                            (access, idx) =>
                              idx === containerIndex ? { ...access, containerId: value } : access
                          ),
                        };
                        setValue(`forms.${formIndex}.permissions`, newPermissions);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a container." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Containers</SelectLabel>
                          {availableContainers.length > 0 ? (
                            availableContainers.map((container) => (
                              <SelectItem key={container.containerId} value={container.containerId}>
                                {container.containerName || container.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No containers available
                            </SelectItem>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`forms.${formIndex}.permissions.${permissionIndex}.containerAccess.${containerIndex}.permission`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      {...register(
                        `forms.${formIndex}.permissions.${permissionIndex}.containerAccess.${containerIndex}.permission`
                      )}
                      value={getValues(
                        `forms.${formIndex}.permissions.${permissionIndex}.containerAccess.${containerIndex}.permission`
                      )}
                      onValueChange={(value) => {
                        const newPermissions = [...getValues(`forms.${formIndex}.permissions`)];
                        newPermissions[permissionIndex] = {
                          ...newPermissions[permissionIndex],
                          containerAccess: newPermissions[permissionIndex].containerAccess.map(
                            (access, idx) =>
                              idx === containerIndex ? { ...access, permission: value } : access
                          ),
                        };
                        setValue(`forms.${formIndex}.permissions`, newPermissions);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Permission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Permissions</SelectLabel>
                          {containerAccessPermissions.map((container) => (
                            <SelectItem key={container.value} value={container.value}>
                              {container.label}
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
            <Button
              type="button"
              onClick={() => {
                const newPermissions = [...getValues(`forms.${formIndex}.permissions`)];
                newPermissions[permissionIndex] = {
                  ...newPermissions[permissionIndex],
                  containerAccess: newPermissions[permissionIndex].containerAccess.filter(
                    (_, idx) => idx !== containerIndex
                  ),
                };
                setValue(`forms.${formIndex}.permissions`, newPermissions);
                remove(containerIndex);
              }}
            >
              <MinusIcon />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        onClick={() => {
          const newPermissions = [...getValues(`forms.${formIndex}.permissions`)];
          newPermissions[permissionIndex] = {
            ...newPermissions[permissionIndex],
            containerAccess: [
              ...newPermissions[permissionIndex].containerAccess,
              { containerId: '', permission: 'containerPermissionUnspecified' },
            ],
          };
          setValue(`forms.${formIndex}.permissions`, newPermissions);
        }}
        className="mt-10 flex-initial w-32"
        disabled={isAddContainerDisabled}
      >
        Add Container
      </Button>
    </div>
  );
};
