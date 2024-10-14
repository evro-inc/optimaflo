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
import { Input } from '@/src/components/ui/input';
import { updateEmailAddresses } from '@/src/redux/gtm/userPermissionSlice';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useEffect, useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

interface TableItem {
  emailAddress: string;
}

interface Props {
  formIndex: number;
  type: string;
  table?: TableItem[];
}

const EmailForm = ({ formIndex, type, table = [] }: Props) => {
  const dispatch = useDispatch();
  const { control, getValues, setValue, watch } = useFormContext();
  const { fields, remove, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.emailAddresses`,
  });

  const emailButtonClick = () => {
    append({ emailAddress: '' });
  };

  console.log('table xx', table);

  const uniqueEmails = useMemo(() => {
    if (type === 'update') {
      return [...new Set(table)];
    } else {
      const emails = table.map((item) => item.emailAddress);
      return [...new Set(emails)];
    }
  }, [table, type]);

  const selectedEmail = watch(`forms.${formIndex}.emailAddresses`);

  useEffect(() => {
    const emailAddresses = getValues(`forms.${formIndex}.emailAddresses`).map(
      (item) => item.emailAddress
    );
    dispatch(updateEmailAddresses({ formIndex, emailAddresses }));
  }, [selectedEmail, formIndex, getValues, dispatch]);

  if (type === 'update') {
    return (
      <div>
        <FormLabel>Email Address:</FormLabel>
        <FormDescription>Which email address do you want to update access to?</FormDescription>
        {fields.map((item, index) => (
          <div className="py-3" key={item.id}>
            <FormField
              key={item.id}
              control={control}
              name={`forms.${formIndex}.emailAddresses.${index}.emailAddress`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-4">
                    <FormControl className="flex-grow">
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          setValue(
                            `forms.${formIndex}.emailAddresses.${index}.emailAddress`,
                            value
                          );
                          dispatch(updateEmailAddresses({ formIndex, emailAddresses: [value] }));
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select an email" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Emails</SelectLabel>
                            {uniqueEmails.map((email, emailIndex) => (
                              <SelectItem key={emailIndex} value={email}>
                                {email}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
      </div>
    );
  } else {
    return (
      <div>
        <FormLabel>Email Address:</FormLabel>
        <FormDescription>Which email address do you want to update access to?</FormDescription>
        {fields.map((item, index) => (
          <div className="py-3" key={item.id}>
            <FormField
              key={item.id}
              control={control}
              name={`forms.${formIndex}.emailAddresses.${index}.emailAddress`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-4">
                    <FormControl className="flex-grow">
                      <Input
                        {...field}
                        onBlur={() => {
                          const updatedEmails = getValues(`forms.${formIndex}.emailAddresses`).map(
                            (item) => item.emailAddress
                          );
                          dispatch(
                            updateEmailAddresses({ formIndex, emailAddresses: updatedEmails })
                          );
                        }}
                        placeholder="Email Address"
                      />
                    </FormControl>
                    <Button type="button" onClick={() => remove(index)}>
                      <MinusIcon />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}

        <Button className="mt-4" type="button" onClick={emailButtonClick}>
          <PlusIcon /> Email
        </Button>
      </div>
    );
  }
};

export default EmailForm;
