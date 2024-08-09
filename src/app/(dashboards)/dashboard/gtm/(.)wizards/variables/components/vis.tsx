import React, { useEffect } from 'react';
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

const Vis = ({ formIndex }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
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
      append({
        type: 'template',
        key: 'selectorType',
        value: 'ID',
      });
      append({
        type: 'template',
        key: 'elementId',
        value: '',
      });
      append({
        type: 'template',
        key: 'outputMethod',
        value: 'BOOLEAN',
      });
      append({
        type: 'template',
        key: 'onScreenRatio',
        value: '50',
      });
    }
  }, [fields, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'vis') {
      setValue(`forms.${formIndex}.parameter`, [
        {
          type: 'template',
          key: 'selectorType',
          value: 'ID',
        },
        {
          type: 'template',
          key: 'elementId',
          value: '',
        },
        {
          type: 'template',
          key: 'outputMethod',
          value: 'BOOLEAN',
        },
        {
          type: 'template',
          key: 'onScreenRatio',
          value: '50',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  const outputMethod = useWatch({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex(
      (field: any) => field.key === 'outputMethod'
    )}.value`,
  });

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

          {item.key === 'outputMethod' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Output Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="BOOLEAN">True/False</SelectItem>
                          <SelectItem value="PERCENT">Percent</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {outputMethod === 'BOOLEAN' && item.key === 'onScreenRatio' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Percent Visible</FormLabel>
                  <FormControl>
                    <Input
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      value={field.value}
                      onChange={field.onChange}
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

export default Vis;
