import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';

import { Input } from '@/src/components/ui/input';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const JavaScriptVariable = ({ formIndex }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'template',
        key: 'name',
        value: '',
      });
    }
  }, [fields, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'j') {
      setValue(`forms.${formIndex}.parameter`, [
        {
          type: 'template',
          key: 'name',
          value: '',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {item.key === 'name' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JavaScript Variable</FormLabel>
                  <FormControl>
                    <Input
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter a variable type"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default JavaScriptVariable;
