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
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  accountAccessPermissions,
  containerAccessPermissions,
} from '../../../entities/@permissions/items';
import { AccountPermission, ContainerPermission } from '@/src/types/types';
import { ContainerPermissions } from './containerPermissions';

type FieldItem = {
  id: string;
  accountId?: string;
  containerId?: string;
};

export default ({ accounts, containers, index, form, table }) => {
  const { setValue, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `forms.${index}`,
  });

  console.log('accounts', accounts);

  const accountIdsWithContainers = new Set(table.map((permission) => permission.accountId));

  const accountsWithContainers = accounts.filter((account) =>
    accountIdsWithContainers.has(account.accountId)
  );

  console.log('accountsWithContainers', accountsWithContainers);

  const allCombinations = accountsWithContainers.flatMap((account) =>
    table
      .filter((permission) => permission.accountId === account.accountId)
      .map((permission) => ({
        accountId: account.accountId,
        containerId: permission.containerAccess.containerId,
      }))
  );

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div>
          <FormLabel>Entity Selection and Permissions</FormLabel>
          <FormDescription>
            Select the accounts and containers you want to give access to.
          </FormDescription>
        </div>
        {fields.map((item: FieldItem, index) => {
          return (
            <div className="space-y-2">
              <div key={item.id} className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name={`permissions.${index}.accountId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account ID</FormLabel>
                      <FormControl>
                        <Select
                          {...form.register(`permissions.${index}.accountId`)}
                          value={getValues(`permissions.${index}.accountId`)}
                          onValueChange={(value) => {
                            setValue(`permissions.${index}.accountId`, value);
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an account." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Account</SelectLabel>
                              {accountsWithContainers.map((account) => (
                                <SelectItem key={account.accountId} value={account.accountId}>
                                  {account.name}
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

                <FormField
                  control={form.control}
                  name={`permissions.${index}.accountAccess.permission`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Permission</FormLabel>
                      <FormControl>
                        <Select
                          {...form.register(`permissions.${index}.accountAccess.permission`)}
                          {...field}
                          onValueChange={(value) => {
                            setValue(`permissions.${index}.accountAccess.permission`, value);
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an account permission." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Account Permissions</SelectLabel>
                              {accountAccessPermissions.map((account) => (
                                <SelectItem key={account.value} value={account.value}>
                                  {account.label}
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

                <Button type="button" onClick={() => remove(index)}>
                  <MinusIcon />
                </Button>
              </div>
              <ContainerPermissions form={form} index={index} table={containers} />
            </div>
          );
        })}

        <Button
          className="mt-4"
          type="button"
          onClick={() =>
            append({ accountId: '', containerId: '', permission: AccountPermission.ADMIN })
          }
          disabled={fields.length >= allCombinations.length}
        >
          <PlusIcon /> Add Entity
        </Button>
      </div>
    </>
  );
};
