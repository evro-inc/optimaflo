import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Textarea } from '@/src/components/ui/textarea';
import FormatValue from './formatValue';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const CustomJS = ({ formIndex, type, table = [] }: Props) => {
  const { control, register } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  // Append a default field if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'template', key: 'javascript', value: '' });
    }
  }, [fields, append]);

  return (
    <div>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          {/* Custom JavaScript */}
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom JavaScript</FormLabel>
                <FormControl>
                  <Textarea
                    {...register(`forms.${formIndex}.parameter.${index}.value`)}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Type your JavaScript code here."
                  />
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

export default CustomJS;
