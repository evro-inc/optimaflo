'use client';

import React, { useEffect, useState } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
} from '@/src/components/ui/select';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
  variables: any[];
}

const LookupTableVariable = ({ formIndex, type, table = [], variables }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.variables.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.variables.type`,
  });

  const {
    fields: mapFields,
    append: appendMap,
    remove: removeMap,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.variables.parameter.${fields.findIndex(
      (field: any) => field.key === 'map'
    )}.list`,
  });

  const [defaultValueChecked, setDefaultValueChecked] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');

  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'template',
        key: 'input',
        value: '{{1st Party Cookie}}',
      });
      append({
        type: 'list',
        key: 'map',
        list: [
          {
            type: 'map',
            map: [
              { type: 'template', key: 'key', value: 'test' },
              { type: 'template', key: 'value', value: '1' },
            ],
          },
        ],
      });
      append({
        type: 'boolean',
        key: 'setDefaultValue',
        value: 'false',
      });
      append({
        type: 'template',
        key: 'defaultValue',
        value: 'test',
      });
    }
  }, [fields, append]);

  useEffect(() => {
    if (variableType === 'smm') {
      setValue(`forms.${formIndex}.variables.parameter`, [
        {
          type: 'template',
          key: 'input',
          value: '{{1st Party Cookie}}',
        },
        {
          type: 'list',
          key: 'map',
          list: [
            {
              type: 'map',
              map: [
                { type: 'template', key: 'key', value: 'test' },
                { type: 'template', key: 'value', value: '1' },
              ],
            },
          ],
        },
        {
          type: 'boolean',
          key: 'setDefaultValue',
          value: 'false',
        },
        {
          type: 'template',
          key: 'defaultValue',
          value: 'test',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  useEffect(() => {
    const setDefaultValueItem = fields.find((item) => item.key === 'setDefaultValue');
    const defaultValueItem = fields.find((item) => item.key === 'defaultValue');

    if (setDefaultValueItem && setDefaultValueItem.value === 'true') {
      setDefaultValueChecked(true);
      if (defaultValueItem) {
        setDefaultValue(defaultValueItem.value);
      }
    }
  }, [fields]);

  if (!variables.length) return <div>Loading...</div>;

  return (
    <div>
      {fields.map((item: any, index: number) => {
        return (
          <div className="py-3" key={item.id}>
            {item.key === 'input' && (
              <div className="flex items-center space-x-2">
                <FormField
                  control={control}
                  name={`forms.${formIndex}.variables.parameter.${index}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Variable</FormLabel>
                      <FormDescription>
                        This is the account you want to create the property in.
                      </FormDescription>
                      <FormControl>
                        <Select
                          {...register(`forms.${formIndex}.variables.parameter.${index}.value`)}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id={`input-variable-${formIndex}`}>
                            <SelectValue placeholder="Select Input Variable" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel className="text-lg font-semibold">
                                Built-In Variables
                              </SelectLabel>
                              {variables
                                .filter((variable: any) => variable.variableType === 'builtIn')
                                .map((variable: any) => (
                                  <SelectItem key={variable.type} value={variable.type}>
                                    {variable.name}
                                  </SelectItem>
                                ))}
                              <SelectLabel className="text-lg font-semibold">
                                User Defined Variables
                              </SelectLabel>
                              {variables
                                .filter((variable: any) => variable.variableType === 'userDefined')
                                .map((variable: any) => (
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
              </div>
            )}

            {item.key === 'map' && (
              <div className="pt-4">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor={`lookup-table-input-${formIndex}`}
                    className="text-sm font-medium leading-none mb-5"
                  >
                    Lookup Table
                  </label>
                </div>
                <div className="space-y-4">
                  {mapFields.map((mapItem, mapIndex) => (
                    <div key={mapItem.id} className="grid grid-cols-3 gap-4">
                      <FormField
                        control={control}
                        name={`forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${0}.value`}
                        render={({ field }) => (
                          <FormControl>
                            <Input
                              {...register(
                                `forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${0}.value`
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Input"
                            />
                          </FormControl>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${1}.value`}
                        render={({ field }) => (
                          <FormControl>
                            <Input
                              {...register(
                                `forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${1}.value`
                              )}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Output"
                            />
                          </FormControl>
                        )}
                      />
                      <Button type="button" onClick={() => removeMap(mapIndex)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  className="mt-5"
                  onClick={() =>
                    appendMap({
                      type: 'map',
                      map: [
                        { type: 'template', key: 'key', value: '' },
                        { type: 'template', key: 'value', value: '' },
                      ],
                    })
                  }
                >
                  + Add Row
                </Button>
              </div>
            )}

            {item.key === 'setDefaultValue' && (
              <div className="flex items-center space-x-2 pt-4">
                <FormField
                  control={control}
                  name={`forms.${formIndex}.variables.parameter.${index}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Checkbox
                          checked={defaultValueChecked}
                          onCheckedChange={(e: boolean) => {
                            setDefaultValueChecked(e);
                            field.onChange(e ? 'true' : 'false');
                          }}
                        />
                      </FormControl>
                      <FormLabel>Set Default Value</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {item.key === 'defaultValue' && defaultValueChecked && (
                <FormField
                  control={control}
                  name={`forms.${formIndex}.variables.parameter.${index}.value`}
                  render={({ field }) => (
                    <Input
                      id={`default-value-${formIndex}`}
                      placeholder="Default Value"
                      {...register(`forms.${formIndex}.variables.parameter.${index}.value`)}
                      value={field.value || defaultValue}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LookupTableVariable;
