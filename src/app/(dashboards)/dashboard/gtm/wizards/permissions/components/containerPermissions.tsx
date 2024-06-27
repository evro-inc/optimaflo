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
import { Input } from '@/src/components/ui/input';
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
import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { containerAccessPermissions } from '../../../entities/@permissions/items';

type FieldItem = {
  id: string;
  emailAddress?: string;
};

export const ContainerPermissions: React.FC<{ form: any; index: number; table: any }> = ({
  form,
  index,
  table,
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `permissions.${index}.containerAccess`,
  });

  const selectedAccountId = form.watch(`permissions.${index}.accountId`);
  const filteredContainers = table.filter(
    (permission) => permission.accountId === selectedAccountId
  );
  return (
    <>
      {fields.map((field, containerIndex) => (
        <div key={field.id} className="flex space-x-4">
          <FormField
            control={form.control}
            name={`permissions.${index}.containerAccess.${containerIndex}.containerId`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Container ID</FormLabel>
                <FormControl>
                  <Select
                    {...form.register(
                      `permissions.${index}.containerAccess.${containerIndex}.containerId`
                    )}
                    value={form.getValues(
                      `permissions.${index}.containerAccess.${containerIndex}.containerId`
                    )}
                    onValueChange={(value) => {
                      form.setValue(
                        `permissions.${index}.containerAccess.${containerIndex}.containerId`,
                        value
                      );
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a container." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Containers</SelectLabel>
                        {filteredContainers.length > 0 ? (
                          filteredContainers.map((container) => (
                            <SelectItem
                              key={container.containerAccess.containerId}
                              value={container.containerAccess.containerId}
                            >
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
            control={form.control}
            name={`permissions.${index}.containerAccess.${containerIndex}.permission`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Container Permission</FormLabel>
                <FormControl>
                  <Select
                    {...form.register(
                      `permissions.${index}.containerAccess.${containerIndex}.permission`
                    )}
                    value={form.getValues(
                      `permissions.${index}.containerAccess.${containerIndex}.permission`
                    )}
                    onValueChange={(value) => {
                      form.setValue(
                        `permissions.${index}.containerAccess.${containerIndex}.permission`,
                        value
                      );
                    }}
                  >
                    <SelectTrigger>
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
          <Button type="button" onClick={() => remove(containerIndex)}>
            <MinusIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        onClick={() => append({ containerId: '', permission: 'containerPermissionUnspecified' })}
      >
        Add Container
      </Button>
    </>
  );
};
