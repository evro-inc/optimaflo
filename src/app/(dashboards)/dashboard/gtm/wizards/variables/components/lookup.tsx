'use client';
import React, { useEffect, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
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
import FormatValue from './formatValue';
import { fetchAllVariables } from '../../../configurations/@variables/items';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const LookupTableVariable = ({ formIndex, type, table = [] }: Props) => {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const {
    fields: mapFields,
    append: appendMap,
    remove: removeMap,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex((field) => field.key === 'map')}.list`,
  });

  const [defaultValueChecked, setDefaultValueChecked] = useState(false);
  const [variables, setVariables] = useState([]);

  // Fetch variables on mount
  useEffect(() => {
    async function fetchVariables() {
      const allVariables: any = await fetchAllVariables();
      setVariables(allVariables);
    }

    fetchVariables();
  }, []);

  console.log('variables', variables);

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'template', key: 'input', value: '' });
      append({ type: 'list', key: 'map', list: [] });
      append({ type: 'boolean', key: 'setDefaultValue', value: false });
    }
  }, [fields, append]);

  return (
    <div>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          {/* Input Variable */}
          <div className="flex items-center space-x-2">
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input Variable</FormLabel>
                  <FormDescription>
                    This is the account you want to create the property in.
                  </FormDescription>
                  <FormControl>
                    <Select
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      value={item.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id={`input-variable-${formIndex}`}>
                        <SelectValue placeholder="Select Input Variable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Built-In Variables</SelectLabel>
                          {variables
                            .filter((variable: any) => variable.variableType === 'builtIn')
                            .map((variable: any) => (
                              <SelectItem key={variable.type} value={variable.type}>
                                {variable.name}
                              </SelectItem>
                            ))}
                          <SelectLabel>User Defined Variables</SelectLabel>
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

          {/* Lookup Table */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <label
                htmlFor={`lookup-table-input-${formIndex}`}
                className="text-sm font-medium leading-none"
              >
                Lookup Table
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {mapFields.map((mapItem, mapIndex) => (
                <div key={mapItem.id} className="flex space-x-2">
                  <FormField
                    control={control}
                    name={`forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${0}.value`}
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          {...register(
                            `forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${0}.value`
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
                    name={`forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${1}.value`}
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          {...register(
                            `forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${1}.value`
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
              onClick={() =>
                appendMap({
                  map: [
                    { key: 'key', value: '' },
                    { key: 'value', value: '' },
                  ],
                })
              }
            >
              + Add Row
            </Button>
          </div>

          {/* Set Default Value */}

          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id={`set-default-value-${formIndex}`}
              checked={item.value}
              onCheckedChange={(e) => {
                setDefaultValueChecked(e);
                control.setValue(`forms.${formIndex}.parameter.${index}.value`, e);
              }}
            />
            <label
              htmlFor={`set-default-value-${formIndex}`}
              className="text-sm font-medium leading-none"
            >
              Set Default Value
            </label>
          </div>

          {defaultValueChecked && (
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.defaultValue`}
                render={({ field: defaultField }) => (
                  <Input
                    id={`default-value-${formIndex}`}
                    placeholder="Default Value"
                    {...register(`forms.${formIndex}.parameter.${index}.defaultValue`)}
                    value={defaultField.value}
                    onChange={defaultField.onChange}
                  />
                )}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LookupTableVariable;
