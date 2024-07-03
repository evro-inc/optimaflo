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
import { Input } from '@/src/components/ui/input';
import { updateEmailAddresses } from '@/src/redux/gtm/userPermissionSlice';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

export default ({ formIndex }) => {
  const dispatch = useDispatch();
  const { control, register, getValues, setValue, watch } = useFormContext();
  const { fields, remove, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.emailAddresses`,
  });

  const emailAddresses = watch(`forms.${formIndex}.emailAddresses`);

  useEffect(() => {
    const updatedEmails = getValues(`forms.${formIndex}.emailAddresses`).map(
      (item) => item.emailAddress
    );
    dispatch(updateEmailAddresses({ formIndex, emailAddresses: updatedEmails }));
  }, [emailAddresses, getValues, formIndex, dispatch]);

  const emailButtonClick = () => {
    append({ emailAddress: '' });
  };

  return (
    <div>
      <FormLabel>Email Address:</FormLabel>
      <FormDescription>Which email address do you want to provide access to.</FormDescription>
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
};
