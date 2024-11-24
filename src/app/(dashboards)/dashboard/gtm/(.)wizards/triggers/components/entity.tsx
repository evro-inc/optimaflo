'use client';
import { Button } from '@/src/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { addEntity, removeEntity, updateEntity } from '@/src/redux/gtm/entitySlice';

interface TableItem {
  accountId: string;
  accountName: string;
  containerId?: string;
  containerName?: string;
  workspaceId?: string;
  workspaceName?: string;
}

interface Props {
  formIndex: number;
  entityData?: TableItem[];
}

const EntityComponent = ({ formIndex, entityData = [] }: Props) => {
  const dispatch = useDispatch();
  const { control, register, watch } = useFormContext();
  const { fields, remove, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.entities`, // Ensure entities are part of the form structure
  });

  const maxUniqueEntities = new Set(
    entityData.map((data) => `${data.accountId}-${data.containerId}-${data.workspaceId}`)
  ).size;

  const currentUniqueEntities = new Set(
    fields.map(
      (field, index) =>
        `${watch(`forms.${formIndex}.entities.${index}.accountId`)}-${watch(
          `forms.${formIndex}.entities.${index}.containerId`
        )}-${watch(`forms.${formIndex}.entities.${index}.workspaceId`)}`
    )
  ).size;

  const entityButtonClick = () => {
    append({ accountId: '', containerId: '', workspaceId: '' }); // Append empty values
    dispatch(addEntity());
  };

  const uniqueAccounts = Array.from(new Set(entityData.map((data) => data.accountId))).map(
    (accountId) => entityData.find((data) => data.accountId === accountId)
  );

  return (
    <div>
      <FormLabel>Entity Selection:</FormLabel>
      <div className="grid grid-cols-4 gap-4 pt-2">
        <FormLabel className="col-span-1">Account</FormLabel>
        <FormLabel className="col-span-1">Container</FormLabel>
        <FormLabel className="col-span-1">Workspace</FormLabel>
      </div>
      {fields.map((item, index) => {
        const selectedAccountId = watch(`forms.${formIndex}.entities.${index}.accountId`);
        const filteredContainers = entityData.filter(
          (data: any) => data.accountId === selectedAccountId
        );
        const uniqueFilteredContainers = Array.from(
          new Set(filteredContainers.map((data: any) => data.containerId))
        ).map((id) => filteredContainers.find((data: any) => data.containerId === id));

        const selectedContainerId = watch(`forms.${formIndex}.entities.${index}.containerId`);
        const filteredWorkspaces = entityData.filter(
          (data: any) => data.containerId === selectedContainerId
        );

        const uniqueFilteredWorkspaces = Array.from(
          new Set(filteredWorkspaces.map((data: any) => data.workspaceId))
        ).map((id) => filteredWorkspaces.find((data: any) => data.workspaceId === id));

        return (
          <div className="grid grid-cols-4 gap-4 items-center mb-3" key={item.id}>
            <div className="col-span-1">
              <FormField
                key={item.id}
                control={control}
                name={`forms.${formIndex}.entities.${index}.accountId`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        {...register(`forms.${formIndex}.entities.${index}.accountId`)}
                        {...field}
                        onValueChange={(value) => {
                          field.onChange(value);
                          dispatch(
                            updateEntity({ entityIndex: index, data: { accountId: value } })
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {uniqueAccounts.map((data: any) => (
                              <SelectItem key={data.accountId} value={data.accountId}>
                                {data.accountName}
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

            <div className="col-span-1">
              <FormField
                key={item.id}
                control={control}
                name={`forms.${formIndex}.entities.${index}.containerId`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        {...register(`forms.${formIndex}.entities.${index}.containerId`)}
                        {...field}
                        onValueChange={(value) => {
                          field.onChange(value);
                          dispatch(
                            updateEntity({ entityIndex: index, data: { containerId: value } })
                          );
                        }}
                        disabled={!selectedAccountId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a container" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {uniqueFilteredContainers.map((data: any) => (
                              <SelectItem key={data.containerId} value={data.containerId}>
                                {data.containerName}
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

            <div className="col-span-1">
              <FormField
                key={item.id}
                control={control}
                name={`forms.${formIndex}.entities.${index}.workspaceId`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        {...register(`forms.${formIndex}.entities.${index}.workspaceId`)}
                        {...field}
                        onValueChange={(value) => {
                          field.onChange(value);
                          dispatch(
                            updateEntity({ entityIndex: index, data: { workspaceId: value } })
                          );
                        }}
                        disabled={!selectedContainerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a workspace" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {uniqueFilteredWorkspaces.map((data: any) => (
                              <SelectItem key={data.workspaceId} value={data.workspaceId}>
                                {data.name}
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

            {index > 0 && (
              <Button
                type="button"
                onClick={() => {
                  remove(index);
                  dispatch(removeEntity(index));
                }}
                className="h-10"
              >
                <MinusIcon />
              </Button>
            )}
          </div>
        );
      })}
      <Button
        className="mt-4"
        type="button"
        onClick={entityButtonClick}
        disabled={fields.length >= maxUniqueEntities || currentUniqueEntities >= maxUniqueEntities}
      >
        <PlusIcon /> Add Entity
      </Button>
    </div>
  );
};

export default EntityComponent;
