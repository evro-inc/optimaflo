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
import { Input } from '@/src/components/ui/input';
import FormatValue from './formatValue';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const DOMElement = ({ formIndex, type, table = [] }: Props) => {
  const { control, register } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'template', key: 'selectorType', value: 'ID' });
      append({ type: 'template', key: 'elementId', value: '' });
      append({ type: 'template', key: 'attributeName', value: '' });
    }
  }, [fields, append]);

  return (
    <div>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          {/* Selection Method */}
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selection Method</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Selection Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ID">ID</SelectItem>
                        <SelectItem value="CSS_SELECTOR">CSS Selector</SelectItem>
                        <SelectItem value="XPATH">XPath</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Element ID */}
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Element ID</FormLabel>
                <FormControl>
                  <Input
                    {...register(`forms.${formIndex}.parameter.${index}.value`)}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter Element ID"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Attribute Name */}
          <FormField
            control={control}
            name={`forms.${formIndex}.parameter.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attribute Name</FormLabel>
                <FormControl>
                  <Input
                    {...register(`forms.${formIndex}.parameter.${index}.value`)}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter Attribute Name"
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

export default DOMElement;
