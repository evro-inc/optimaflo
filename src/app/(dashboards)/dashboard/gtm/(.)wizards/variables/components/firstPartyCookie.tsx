import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const FirstPartyCookie = ({ formIndex }: Props) => {
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
      append({ type: 'template', key: 'name', value: '' });
      append({ type: 'boolean', key: 'decodeCookie', value: 'false' });
    } else if (fields.length > 2) {
      remove(2); // Ensure only two fields are appended
    }
  }, [fields, append, remove]);

  useEffect(() => {
    if (variableType === 'k') {
      // Update parameters for 'k' type
      setValue(`forms.${formIndex}.parameter`, [
        { type: 'template', key: 'name', value: '' },
        { type: 'boolean', key: 'decodeCookie', value: 'false' },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => {
        return (
          <div className="py-3" key={item.id}>
            {item.key === 'name' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cookie Name</FormLabel>
                    <FormControl>
                      <Input
                        {...register(`forms.${formIndex}.parameter.${index}.value`)}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Enter cookie name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {item.key === 'decodeCookie' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Checkbox
                        {...register(`forms.${formIndex}.parameter.${index}.value`)}
                        checked={field.value === 'true'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'true' : 'false')}
                      />
                    </FormControl>
                    <FormLabel>Decode Cookie</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FirstPartyCookie;
