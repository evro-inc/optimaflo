import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const Constant = ({ formIndex, type, table = [] }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
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
      append({ type: 'template', key: 'value', value: 'test' });
    } else if (fields.length > 1) {
      remove(1); // Ensure only one field is appended
    }
  }, [fields, append, remove]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'c') {
      // Update parameters for 'c' type
      setValue(`forms.${formIndex}.parameter`, [{ type: 'template', key: 'value', value: '' }]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {item.key === 'value' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter value"
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

export default Constant;
