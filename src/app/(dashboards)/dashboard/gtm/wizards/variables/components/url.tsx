import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
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

const URL = ({ formIndex, type, table = [] }: Props) => {
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
        key: 'component',
        value: 'URL',
      });
    }
  }, [fields, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'u') {
      setValue(`forms.${formIndex}.variables.parameter`, [
        {
          type: 'template',
          key: 'component',
          value: 'URL',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      <FormLabel>URL</FormLabel>
      <FormDescription>Select a component type.</FormDescription>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {item.key === 'component' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component Type</FormLabel>
                  <FormControl>
                    <Select
                      {...register(`forms.${formIndex}.parameter.${index}.type`)}
                      value={field.value}
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
          )}
        </div>
      ))}
    </div>
  );
};

export default URL;
