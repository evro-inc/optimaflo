'use client';
import { Button } from '@/src/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useEffect, useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { accountAccessPermissions } from '../../../entities/@permissions/items';
import { AccountPermission, ContainerPermission } from '@/src/types/types';
import { ContainerPermissions } from './containerPermissions';
import { useDispatch, useSelector } from 'react-redux';
import { addForm, updatePermissions } from '@/src/redux/gtm/userPermissionSlice';
import { RootState } from '@/src/redux/store';

type FieldItem = {
  id: string;
  accountId?: string;
  containerId?: string;
};

export default function EntitySelect({
  accountsWithContainers,
  containers,
  formIndex,
  table = [],
  type,
}: {
  accountsWithContainers: any;
  containers: any;
  formIndex: number;
  table?: any;
  type?: string;
}) {
  const dispatch = useDispatch();
  const { setValue, getValues, control, register } = useFormContext();

  const forms = useSelector((state: RootState) => state.gtmUserPermission.forms);

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: `forms.${formIndex}.permissions`,
  });

  useEffect(() => {
    if (!forms[formIndex]) {
      dispatch(addForm());
    }
  }, [formIndex, forms, dispatch]);

  // Compute selectedAccountIds directly without memoization
  const selectedAccountIds =
    useWatch({
      control,
      name: `forms.${formIndex}.permissions`,
    })?.map((permission) => permission.accountId) || [];

  // Compute isAddEntityDisabled directly without memoization
  const isAddEntityDisabled = selectedAccountIds.length >= accountsWithContainers.length;

  useEffect(() => {
    const updatedPermissions = getValues(`forms.${formIndex}.permissions`);
    dispatch(updatePermissions({ formIndex, permissions: updatedPermissions }));
  }, [fields, getValues, formIndex, dispatch]);

  const selectedEmailAddresses = useSelector(
    (state: RootState) => state.gtmUserPermission.forms[formIndex]?.emailAddresses || []
  );

  const availableAccounts = useMemo(() => {
    if (type === 'update') {
      const accounts = table.map((item) => ({
        accountId: item.accountId,
        accountName: item.accountName,
        email: item.emailAddress,
      }));

      const accountAccess = accounts.filter((account) =>
        selectedEmailAddresses.includes(account.email)
      );
      const uniqueAccounts = accountAccess.filter(
        (value, index, self) => index === self.findIndex((t) => t.accountId === value.accountId)
      );

      return uniqueAccounts.filter((account) => selectedEmailAddresses.includes(account.email));
    } else {
      return accountsWithContainers;
    }
  }, [selectedEmailAddresses, table, accountsWithContainers, type]);

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div>
          <FormLabel>Entity Selection and Permissions</FormLabel>
          <FormDescription>
            Select the accounts and containers you want to give access to.
          </FormDescription>
        </div>
        {fields.map((item: FieldItem, permissionIndex) => {
          const currentAccountId = getValues(
            `forms.${formIndex}.permissions.${permissionIndex}.accountId`
          );

          return (
            <div className="space-y-2" key={item.id}>
              <div className="flex items-center space-x-4 pb-5">
                <FormField
                  control={control}
                  name={`forms.${formIndex}.permissions.${permissionIndex}.accountId`}
                  render={() => (
                    <FormItem>
                      <FormLabel>Account ID</FormLabel>
                      <FormControl>
                        <Select
                          {...register(
                            `forms.${formIndex}.permissions.${permissionIndex}.accountId`
                          )}
                          value={currentAccountId}
                          onValueChange={(value) => {
                            const newPermissions = [...getValues(`forms.${formIndex}.permissions`)];
                            newPermissions[permissionIndex] = {
                              ...newPermissions[permissionIndex],
                              accountId: value,
                            };
                            setValue(`forms.${formIndex}.permissions`, newPermissions);
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select an account." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Account</SelectLabel>
                              {availableAccounts.map((account) => (
                                <SelectItem key={account.accountId} value={account.accountId}>
                                  {account.accountName || account.name}
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
                  control={control}
                  name={`forms.${formIndex}.permissions.${permissionIndex}.accountAccess.permission`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Permission</FormLabel>
                      <FormControl>
                        <Select
                          {...register(
                            `forms.${formIndex}.permissions.${permissionIndex}.accountAccess.permission`
                          )}
                          {...field}
                          onValueChange={(value) => {
                            const newPermissions = [...getValues(`forms.${formIndex}.permissions`)];
                            newPermissions[permissionIndex] = {
                              ...newPermissions[permissionIndex],
                              accountAccess: {
                                ...newPermissions[permissionIndex].accountAccess,
                                permission: value,
                              },
                            };
                            setValue(`forms.${formIndex}.permissions`, newPermissions);
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a permission." />
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

                <Button type="button" onClick={() => remove(permissionIndex)}>
                  <MinusIcon />
                </Button>
              </div>
              <ContainerPermissions
                formIndex={formIndex}
                permissionIndex={permissionIndex}
                table={containers}
              />
            </div>
          );
        })}

        <Button
          className="mt-4"
          type="button"
          onClick={() =>
            append({
              accountId: '',
              accountAccess: { permission: AccountPermission.UNSPECIFIED },
              containerAccess: [{ containerId: '', permission: ContainerPermission.UNSPECIFIED }],
            })
          }
          disabled={isAddEntityDisabled}
        >
          <PlusIcon /> Add Entity
        </Button>
      </div>
    </>
  );
}
