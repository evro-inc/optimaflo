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

const DataLayerVariable = ({ formIndex }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  const [defaultValueChecked, setDefaultValueChecked] = useState(false);

  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'template',
        key: 'name',
        value: '',
      });
      append({
        type: 'boolean',
        key: 'setDefaultValue',
        value: 'false',
      });
      append({ type: 'template', key: 'defaultValue', value: '' });
      append({
        type: 'integer',
        key: 'dataLayerVersion',
        value: '2',
      });
    }
  }, [fields, append]);

  useEffect(() => {
    if (variableType === 'v') {
      setValue(`forms.${formIndex}.parameter`, [
        {
          type: 'template',
          key: 'name',
          value: '',
        },
        {
          type: 'boolean',
          key: 'setDefaultValue',
          value: 'false',
        },
        { type: 'template', key: 'defaultValue', value: '' },
        {
          type: 'integer',
          key: 'dataLayerVersion',
          value: '2',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  useEffect(() => {
    const setDefaultValueItem = fields.find((item: any) => item.key === 'setDefaultValue');
    if (setDefaultValueItem && setDefaultValueItem.value === 'true') {
      setDefaultValueChecked(true);
    }
  }, [fields]);

  return (
    <div>
      {fields.map((item: any, index: number) => {
        return (
          <div className="py-3" key={item.id}>
            {item.key === 'name' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
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

            {item.key === 'setDefaultValue' && (
              <div className="flex items-center space-x-2 pt-4">
                <FormField
                  control={control}
                  name={`forms.${formIndex}.parameter.${index}.value`}
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

            {item.key === 'defaultValue' && defaultValueChecked && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <Input
                    id={`default-value-${formIndex}`}
                    placeholder="Default Value"
                    {...register(`forms.${formIndex}.parameter.${index}.value`)}
                    value={field.value} // Ensure value is set correctly
                    onChange={(e) => setValue(field.name, e.target.value)} // Handle onChange for Input
                  />
                )}
              />
            )}

            {item.key === 'dataLayerVersion' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
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
          </div>
        );
      })}
    </div>
  );
};

export default DataLayerVariable;
