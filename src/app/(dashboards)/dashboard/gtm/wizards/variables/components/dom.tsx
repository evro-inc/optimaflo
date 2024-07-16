import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
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

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const DOMElement = ({ formIndex, type, table = [] }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.variables.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.variables.type`,
  });

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'template',
        key: 'elementId',
        value: 'test',
      });
      append({
        type: 'template',
        key: 'attributeName',
        value: 'testing',
      });
      append({
        type: 'template',
        key: 'selectorType',
        value: 'ID',
      });
    }
  }, [fields, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'd') {
      setValue(`forms.${formIndex}.variables.parameter`, [
        {
          type: 'template',
          key: 'elementId',
          value: 'test',
        },
        {
          type: 'template',
          key: 'attributeName',
          value: 'testing',
        },
        {
          type: 'template',
          key: 'selectorType',
          value: 'ID',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {/* Selection Method */}
          {item.key === 'selectorType' && (
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
          )}

          {item.key === 'elementId' && (
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
          )}

          {item.key === 'attributeName' && (
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
          )}
        </div>
      ))}
    </div>
  );
};

export default DOMElement;
