'use client';
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
import {
  accountAccessPermissions,
  containerAccessPermissions,
} from '../../../entities/@permissions/items';
import { AccountPermission, ContainerPermission } from '@/src/types/types';
import { ContainerPermissions } from './containerPermissions';
import { useDispatch, useSelector } from 'react-redux';
import { addForm, updatePermissions } from '@/src/redux/gtm/userPermissionSlice';
import { RootState } from '@/src/redux/store';
import { Input } from '@/src/components/ui/input';

type FieldItem = {
  id: string;
  accountId?: string;
  containerId?: string;
};

export default ({ accountsWithContainers, containers, formIndex, selectedRowData }) => {
  const dispatch = useDispatch();
  const { setValue, getValues, control, register } = useFormContext();

  //const forms = useSelector((state: RootState) => state.gtmUserPermission.forms);
  //console.log('forms state', forms);

  console.log('selectedRowData 2', selectedRowData);
  const selectedRowDataArray = Array.isArray(selectedRowData) ? selectedRowData : Object.values(selectedRowData);

  const uniqueAccountIds = [...new Set(selectedRowDataArray.map(row => row.accountId))];
  const uniqueEmailAddresses = [...new Set(selectedRowDataArray.map(row => row.emailAddress))];

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: `forms.${formIndex}.permissions`,
  });

  /*   useEffect(() => {
      if (!forms[formIndex]) {
        dispatch(addForm());
      }
    }, [formIndex, forms, dispatch]); */

  const selectedAccountIds =
    useWatch({
      control,
      name: `forms.${formIndex}.permissions`,
    })?.map((permission) => permission.accountId) || [];

  const isAddEntityDisabled = useMemo(
    () => selectedAccountIds.length >= accountsWithContainers.length,
    [selectedAccountIds, accountsWithContainers]
  );

  useEffect(() => {
    const updatedPermissions = getValues(`forms.${formIndex}.permissions`);
    dispatch(updatePermissions({ formIndex, permissions: updatedPermissions }));
  }, [fields, getValues, formIndex, dispatch]);

  console.log("fields", fields);


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
          const currentAccountId = getValues(`forms.${formIndex}.permissions.${permissionIndex}.accountId`);
          const currentEmailAddress = getValues(`forms.${formIndex}.permissions.${permissionIndex}.emailAddress`);
          const availableAccounts = accountsWithContainers.filter(
            (account) => !selectedAccountIds.includes(account.accountId) || account.accountId === currentAccountId
          );

          console.log("availableAccounts", availableAccounts);


          return (
            <div className="space-y-2" key={item.id}>
              <FormField
                control={control}
                name={`forms.${formIndex}.permissions.${permissionIndex}.emailAddress`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Select
                        {...register(
                          `forms.${formIndex}.permissions.${permissionIndex}.emailAddress`
                        )}
                        value={currentEmailAddress}
                        onValueChange={(value) => {
                          const newPermissions = [...getValues(`forms.${formIndex}.permissions`)];
                          newPermissions[permissionIndex] = {
                            ...newPermissions[permissionIndex],
                            emailAddress: value,
                          };
                          setValue(`forms.${formIndex}.permissions`, newPermissions);
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select an email address." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Email Address</SelectLabel>
                            {uniqueEmailAddresses.map((email, index) => (
                              <SelectItem key={index} value={email}>
                                {email}
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


              <div className="flex items-center space-x-4 pb-5">
                <FormField
                  control={control}
                  name={`forms.${formIndex}.permissions.${permissionIndex}.accountId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account ID</FormLabel>
                      <FormControl>
                        <Select
                          {...register(`forms.${formIndex}.permissions.${permissionIndex}.accountId`)}
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
                              {uniqueAccountIds.map((accountId, index) => (
                                <SelectItem key={index} value={accountId}>
                                  {accountId}
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
              {/* <ContainerPermissions
                formIndex={formIndex}
                permissionIndex={permissionIndex}
                table={containers}
                selectedRowData={selectedRowData}
              /> */}
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
};
