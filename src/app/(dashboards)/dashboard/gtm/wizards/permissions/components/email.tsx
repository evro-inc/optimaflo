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
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useFieldArray } from 'react-hook-form';

type FieldItem = {
  id: string;
  emailAddress?: string;
};

export default ({ nestIndex, form }) => {
  const { fields, remove, append } = useFieldArray({
    control: form.control,
    name: `emailAddresses.${nestIndex}.emailAddress`,
  });

  return (
    <div>
      <FormField
        control={form.control}
        name={`emailAddresses.${nestIndex}.emailAddress`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address:</FormLabel>
            <FormDescription>Which email address do you want to provide access to.</FormDescription>
            {fields.map((item: FieldItem, k) => {
              return (
                <div className="flex items-center space-x-4" key={item.id}>
                  <FormControl className="flex-grow">
                    <Input
                      {...form.register(`emailAddresses.${nestIndex}.emailAddress`)}
                      placeholder="Email Address"
                    />
                  </FormControl>
                  <Button type="button" onClick={() => remove(k)}>
                    <MinusIcon />
                  </Button>
                </div>
              );
            })}
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        className="mt-4"
        type="button"
        onClick={() =>
          append({
            emailAddress: '',
          })
        }
      >
        <PlusIcon /> Email
      </Button>
    </div>
  );
};
