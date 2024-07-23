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
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
  variables: any[];
}

const UserProvidedData = ({ formIndex, type, table = [], variables }: Props) => {
  const { control, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  const {
    fields: disabledElementsFields,
    append: appendDisabledElement,
    remove: removeDisabledElement,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex(
      (field: any) => field.key === 'disabledElements'
    )}.list`,
  });

  const [configType, setConfigType] = useState<string>('MANUAL');
  const [elementBlockingChecked, setElementBlockingChecked] = useState(false);

  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'template', key: 'mode', value: '' });
    }
  }, [fields, append]);

  useEffect(() => {
    if (variableType === 'awec') {
      setValue(`forms.${formIndex}.parameter`, [{ type: 'template', key: 'mode', value: '' }]);
    }
  }, [variableType, setValue, formIndex]);

  const handleConfigChange = (value: string) => {
    setConfigType(value);
    let newFields = [{ type: 'template', key: 'mode', value }];
    if (value === 'MANUAL') {
      newFields = [
        ...newFields,
        { type: 'template', key: 'email', value: '{{not-set}}' },
        { type: 'template', key: 'phone_number', value: '{{not-set}}' },
        { type: 'template', key: 'first_name', value: '{{not-set}}' },
        { type: 'template', key: 'last_name', value: '{{not-set}}' },
        { type: 'template', key: 'street', value: '{{not-set}}' },
        { type: 'template', key: 'city', value: '{{not-set}}' },
        { type: 'template', key: 'region', value: '{{not-set}}' },
        { type: 'template', key: 'country', value: '{{not-set}}' },
        { type: 'template', key: 'postal_code', value: '{{not-set}}' },
      ];
    } else if (value === 'CODE') {
      newFields = [...newFields, { type: 'template', key: 'dataSource', value: '{{not-set}}' }];
    } else if (value === 'AUTO') {
      newFields = [
        ...newFields,
        { type: 'boolean', key: 'enableElementBlocking', value: 'false' },
        { type: 'list', key: 'disabledElements', list: [] },
      ];
    }
    setValue(`forms.${formIndex}.parameter`, newFields);
  };

  useEffect(() => {
    const elementBlockingItem = fields.find((item: any) => item.key === 'enableElementBlocking');
    if (elementBlockingItem && elementBlockingItem.value === 'true') {
      setElementBlockingChecked(true);
    } else {
      setElementBlockingChecked(false);
    }
  }, [fields]);

  const handleAddSelector = () => {
    appendDisabledElement({
      type: 'map',
      map: [{ type: 'template', key: 'column1', value: '' }],
    });
  };

  const handleRemoveSelector = (index: number) => {
    removeDisabledElement(index);
  };

  if (!length) return <div>Loading...</div>;

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {item.key === 'mode' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>
                    Improve measurement and get more insights with data people provide to your
                    website.
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleConfigChange(value);
                      }}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="MANUAL" />
                        </FormControl>
                        <FormLabel className="font-normal">Manual Configuration</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="AUTO" />
                        </FormControl>
                        <FormLabel className="font-normal">Auto Configuration</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="CODE" />
                        </FormControl>
                        <FormLabel className="font-normal">Code</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {configType === 'MANUAL' &&
            [
              'email',
              'phone_number',
              'first_name',
              'last_name',
              'street',
              'city',
              'region',
              'country',
              'postal_code',
            ].includes(item.key) && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{item.key.replace('_', ' ').toUpperCase()}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(`{{${value}}}`)}
                      value={field.value.replace(/[{}]/g, '')} // Remove the curly braces for display
                    >
                      <SelectTrigger id={item.key}>
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="{{not-set}}">Not set</SelectItem>
                        <SelectGroup>
                          <SelectLabel className="text-lg font-semibold">
                            Built-In Variables
                          </SelectLabel>
                          {variables
                            .filter((variable: any) => variable.variableType === 'builtIn')
                            .map((variable: any) => (
                              <SelectItem key={variable.name} value={variable.name}>
                                {variable.name}
                              </SelectItem>
                            ))}
                          <SelectLabel className="text-lg font-semibold">
                            User Defined Variables
                          </SelectLabel>
                          {variables
                            .filter((variable: any) => variable.variableType === 'userDefined')
                            .map((variable: any) => (
                              <SelectItem key={variable.name} value={variable.name}>
                                {variable.name}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {configType === 'CODE' && item.key === 'dataSource' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Source</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value.replace(/[{}]/g, '')} // Remove the curly braces for display
                      onValueChange={(value) => setValue(field.name, `{{${value}}}`)}
                    >
                      <SelectTrigger id={`input-variable-${formIndex}`}>
                        <SelectValue placeholder="Select Data Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="{{not-set}}">Not set</SelectItem>
                        <SelectGroup>
                          <SelectLabel className="text-lg font-semibold">
                            Built-In Variables
                          </SelectLabel>
                          {variables
                            .filter((variable: any) => variable.variableType === 'builtIn')
                            .map((variable: any) => (
                              <SelectItem key={variable.name} value={variable.name}>
                                {variable.name}
                              </SelectItem>
                            ))}
                          <SelectLabel className="text-lg font-semibold">
                            User Defined Variables
                          </SelectLabel>
                          {variables
                            .filter((variable: any) => variable.variableType === 'userDefined')
                            .map((variable: any) => (
                              <SelectItem key={variable.name} value={variable.name}>
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

          {configType === 'AUTO' && item.key === 'enableElementBlocking' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exclude selected elements</FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={elementBlockingChecked}
                      onCheckedChange={(e: boolean) => {
                        setElementBlockingChecked(e);
                        field.onChange(e ? 'true' : 'false');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {configType === 'AUTO' && item.key === 'disabledElements' && elementBlockingChecked && (
            <div className="pt-4">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor={`disabled-elements-${formIndex}`}
                  className="text-sm font-medium leading-none mb-5"
                >
                  CSS Selectors
                </label>
              </div>
              <div className="space-y-4">
                {disabledElementsFields.map((mapItem, mapIndex) => (
                  <div key={mapItem.id} className="flex items-center space-x-2">
                    {mapItem.map.map((innerItem: any, innerIndex: number) => (
                      <React.Fragment key={innerItem.id}>
                        {innerItem.key === 'column1' && (
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${innerIndex}.value`}
                            render={({ field }) => (
                              <FormControl>
                                <Input
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="CSS Selector"
                                />
                              </FormControl>
                            )}
                          />
                        )}
                      </React.Fragment>
                    ))}
                    <Button type="button" onClick={() => handleRemoveSelector(mapIndex)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" className="mt-5" onClick={handleAddSelector}>
                + Add Selector
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UserProvidedData;
