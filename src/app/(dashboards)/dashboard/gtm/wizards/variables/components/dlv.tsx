import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import FormatValue from './formatValue';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const DataLayerVariable = ({ formIndex, type, table = [] }: Props) => {
  const { control, register } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const [defaultValueChecked, setDefaultValueChecked] = useState(false);

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'template', key: 'name', value: '' });
      append({ type: 'integer', key: 'dataLayerVersion', value: '2' });
      append({ type: 'boolean', key: 'setDefaultValue', value: false });
    }
  }, [fields, append]);

  return (
    <div>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          {/* Data Layer Variable Name */}

          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Layer Variable Name</FormLabel>
                <FormControl>
                  <Input
                    {...register(`forms.${formIndex}.parameter.${index}.value`)}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter Data Layer Variable Name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data Layer Version */}
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Layer Version</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Data Layer Version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="1">Version 1</SelectItem>
                        <SelectItem value="2">Version 2</SelectItem>
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

export default DataLayerVariable;
