import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
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

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const AEV = ({ formIndex, type, table = [] }: Props) => {
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
      append({ type: 'boolean', key: 'setDefaultValue', value: 'false' });
      append({ type: 'template', key: 'varType', value: 'ELEMENT' });
    } else if (fields.length > 2) {
      remove(2); // Ensure only two fields are appended
    }
  }, [fields, append, remove]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'aev') {
      // Update parameters for 'aev' type
      setValue(`forms.${formIndex}.parameter`, [
        { type: 'boolean', key: 'setDefaultValue', value: 'false' },
        { type: 'template', key: 'varType', value: 'ELEMENT' },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  const defaultValueChecked =
    useWatch({
      control,
      name: `forms.${formIndex}.parameter`,
    })?.find((param) => param.key === 'setDefaultValue')?.value === 'true';

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {item.key === 'varType' && (
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
          )}

          {item.key === 'setDefaultValue' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Set Default Value</FormLabel>
                  <FormControl>
                    <Checkbox
                      {...field}
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) => {
                        setValue(
                          `forms.${formIndex}.parameter.${index}.value`,
                          checked ? 'true' : 'false'
                        );
                      }}
                    />
                  </FormControl>
                  {defaultValueChecked && (
                    <FormControl>
                      <Input
                        {...register(`forms.${formIndex}.parameter.${index}.defaultValue`)}
                        placeholder="Enter value"
                      />
                    </FormControl>
                  )}
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

export default AEV;
