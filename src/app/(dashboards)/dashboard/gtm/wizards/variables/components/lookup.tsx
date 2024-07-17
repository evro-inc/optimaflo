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
        value: '',
      });
      append({
        type: 'list',
        key: 'map',
        list: [
          {
            type: 'map',
            map: [
              { type: 'template', key: 'key', value: '' },
              { type: 'template', key: 'value', value: '' },
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
        value: '',
      });
    }
  }, [fields, append]);

  useEffect(() => {
    if (variableType === 'smm' || variableType === 'remm') {
      setValue(`forms.${formIndex}.variables.parameter`, [
        {
          type: 'template',
          key: 'input',
          value: '',
        },
        {
          type: 'list',
          key: 'map',
          list: [
            {
              type: 'map',
              map: [
                { type: 'template', key: 'key', value: '' },
                { type: 'template', key: 'value', value: '' },
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
          value: '',
        },
      ]);
      if (variableType === 'remm') {
        append({
          type: 'boolean',
          key: 'fullMatch',
          value: 'false',
        });
        append({
          type: 'boolean',
          key: 'replaceAfterMatch',
          value: 'false',
        });
        append({
          type: 'boolean',
          key: 'ignoreCase',
          value: 'false',
        });
      }
    }
  }, [variableType, setValue, formIndex, append]);

  useEffect(() => {
    const setDefaultValueItem = fields.find((item: any) => item.key === 'setDefaultValue');
    const defaultValueItem = fields.find((item: any) => item.key === 'defaultValue');

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
      {fields.map((item: any, index: number) => (
        <div key={item.id}>
          {item.key === 'input' && (
            <div className="flex items-center space-x-2">
              <FormField
                control={control}
                name={`forms.${formIndex}.variables.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input Variable</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value.replace(/[{}]/g, '')} // Remove the curly braces for display
                        onValueChange={(value) => setValue(field.name, `{{${value}}}`)}
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
                                <SelectItem key={variable.type} value={variable.name}>
                                  {variable.name}
                                </SelectItem>
                              ))}
                            <SelectLabel className="text-lg font-semibold">
                              User Defined Variables
                            </SelectLabel>
                            {variables
                              .filter((variable: any) => variable.variableType === 'userDefined')
                              .map((variable: any) => (
                                <SelectItem key={variable.type} value={variable.name}>
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
                    {mapItem.map.map((innerItem: any, innerIndex: number) => (
                      <React.Fragment key={innerItem.id}>
                        {innerItem.key === 'key' && (
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${innerIndex}.value`}
                            render={({ field }) => (
                              <FormControl>
                                <Input
                                  {...register(
                                    `forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${innerIndex}.value`
                                  )}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Input"
                                />
                              </FormControl>
                            )}
                          />
                        )}
                        {innerItem.key === 'value' && (
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${innerIndex}.value`}
                            render={({ field }) => (
                              <FormControl>
                                <Input
                                  {...register(
                                    `forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${innerIndex}.value`
                                  )}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Output"
                                />
                              </FormControl>
                            )}
                          />
                        )}
                      </React.Fragment>
                    ))}
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
                    value={field.value} // Ensure value is set correctly
                    onChange={(e) => setValue(field.name, e.target.value)} // Handle onChange for Input
                  />
                )}
              />
            )}
            {/* Additional fields for 'remm' type */}
            {variableType === 'remm' && (
              <>
                {item.key === 'fullMatch' && (
                  <FormField
                    control={control}
                    name={`forms.${formIndex}.variables.parameter.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Checkbox
                            checked={field.value === 'true'}
                            onCheckedChange={(e: boolean) => field.onChange(e ? 'true' : 'false')}
                          />
                        </FormControl>
                        <FormLabel>Full Match</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {item.key === 'replaceAfterMatch' && (
                  <FormField
                    control={control}
                    name={`forms.${formIndex}.variables.parameter.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Checkbox
                            checked={field.value === 'true'}
                            onCheckedChange={(e: boolean) => field.onChange(e ? 'true' : 'false')}
                          />
                        </FormControl>
                        <FormLabel>Replace After Match</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {item.key === 'ignoreCase' && (
                  <FormField
                    control={control}
                    name={`forms.${formIndex}.variables.parameter.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Checkbox
                            checked={field.value === 'true'}
                            onCheckedChange={(e: boolean) => field.onChange(e ? 'true' : 'false')}
                          />
                        </FormControl>
                        <FormLabel>Ignore Case</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LookupTableVariable;
