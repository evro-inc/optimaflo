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

const AEV = ({ formIndex, type, table = [] }: Props) => {
  const { control, register } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const [defaultValueChecked, setDefaultValueChecked] = useState(false);

  // Append a default field if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'typeUnspecified', key: '', value: '' });
    }
  }, [fields, append]);

  return (
    <div>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          {/* Variable Type */}
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Type</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a variable type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Variable Type</SelectLabel>
                        {aevType.map((variable) => (
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

          {/* Set Default Value */}
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>test</FormLabel>
                <FormControl>
                  <Checkbox
                    {...register(`forms.${formIndex}.parameter.${index}`)}
                    checked={field.value}
                    onCheckedChange={(e) => field.onChange(e)}
                  />
                </FormControl>
                {field.value && (
                  <FormControl>
                    <Input
                      {...register(`forms.${formIndex}.parameter.${index}`)}
                      placeholder={`Enter value`}
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ))}
    </div>
  );
};

export default AEV;
