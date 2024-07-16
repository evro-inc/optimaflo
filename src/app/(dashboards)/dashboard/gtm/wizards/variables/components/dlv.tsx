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
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const DataLayerVariable = ({ formIndex, type, table = [] }: Props) => {
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
        key: 'name',
        value: 'testGTM',
      });
      append({
        type: 'boolean',
        key: 'setDefaultValue',
        value: 'false',
      });
      append({
        type: 'integer',
        key: 'dataLayerVersion',
        value: '2',
      });
    }
  }, [fields, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'v') {
      setValue(`forms.${formIndex}.variables.parameter`, [
        {
          type: 'template',
          key: 'name',
          value: 'testGTM',
        },
        {
          type: 'boolean',
          key: 'setDefaultValue',
          value: 'false',
        },
        {
          type: 'integer',
          key: 'dataLayerVersion',
          value: '2',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => {
        console.log('item: ', item);

        return (
          <div className="py-3" key={item.id}>
            {item.key === 'name' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.variables.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Layer Variable Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter Data Layer Variable Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {item.key === 'dataLayerVersion' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.variables.parameter.${index}.value`}
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
            )}

            {item.key === 'setDefaultValue' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.variables.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Set Default Value</FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value === 'true'}
                        onCheckedChange={(e) => field.onChange(e ? 'true' : 'false')}
                      />
                    </FormControl>
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

export default DataLayerVariable;
