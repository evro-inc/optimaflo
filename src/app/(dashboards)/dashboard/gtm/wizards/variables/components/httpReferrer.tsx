import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import {
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
import { httpReferrerType } from '../../../configurations/@variables/items';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const HttpReferrer = ({ formIndex, type, table = [] }: Props) => {
  const { control, register } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  // Append a default field if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: '', key: '', value: '' });
    }
  }, [fields, append]);

  return (
    <div>
      <FormLabel>HTTP Referrer</FormLabel>
      <FormDescription>Select a component type.</FormDescription>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.type`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Component Type</FormLabel>
                <FormControl>
                  <Select
                    {...register(`forms.${formIndex}.parameter.${index}.type`)}
                    {...field}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a variable type." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Variable Type</SelectLabel>
                        {httpReferrerType.map((variable) => (
                          <SelectItem key={variable.type} value={variable.type}>
                            {variable.name}
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
      ))}
    </div>
  );
};

export default HttpReferrer;
