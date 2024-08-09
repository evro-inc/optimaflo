'use client';
import React, { useEffect } from 'react';
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

const AEV = ({ formIndex }: Props) => {
  const { control, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const parameterFields = useWatch({
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
      append({ type: 'template', key: 'varType', value: 'ELEMENT' });
      append({ type: 'boolean', key: 'setDefaultValue', value: 'false' });
    }
  }, [fields.length, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'aev') {
      const hasVarType = parameterFields.some((param) => param.key === 'varType');
      const hasSetDefaultValue = parameterFields.some((param) => param.key === 'setDefaultValue');

      if (!hasVarType || !hasSetDefaultValue) {
        setValue(`forms.${formIndex}.parameter`, [
          { type: 'template', key: 'varType', value: 'ELEMENT' },
          { type: 'boolean', key: 'setDefaultValue', value: 'false' },
        ]);
      }
    }
  }, [variableType, parameterFields, setValue, formIndex]);

  // Append attribute field if varTypeValue is 'ATTRIBUTE'
  useEffect(() => {
    const varTypeValue = parameterFields?.find((param) => param.key === 'varType')?.value;
    const hasAttributeField = parameterFields.some((param) => param.key === 'attribute');

    if (varTypeValue === 'ATTRIBUTE' && !hasAttributeField) {
      append({ type: 'template', key: 'attribute', value: '' });
    }
  }, [parameterFields, append]);

  useEffect(() => {
    const varTypeValue = parameterFields?.find((param) => param.key === 'setDefaultValue')?.value;
    const hasAttributeField = parameterFields.some((param) => param.key === 'defaultValue');

    if (varTypeValue === 'true' && !hasAttributeField) {
      append({ type: 'template', key: 'defaultValue', value: '' });
    }
  }, [parameterFields, append]);

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

          {item.key === 'attribute' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attribute Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter attribute name" />
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'defaultValue' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Value</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter default value" />
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

export default AEV;
