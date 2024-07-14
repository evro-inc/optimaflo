import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import { aevType } from '../../../configurations/@variables/items';
import FormatValue from './formatValue';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const Constant = ({ formIndex, type, table = [] }: Props) => {
  const { control, register } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const [defaultValueChecked, setDefaultValueChecked] = useState(false);

  // Append a default field if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'template', key: 'value', value: '' });
    }
  }, [fields, append]);

  return (
    <div>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          {/* Constant Value */}
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
        </div>
      ))}
    </div>
  );
};

export default Constant;
