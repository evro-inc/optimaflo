import React, { useEffect } from 'react';
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
  caseConversionTypes,
  formatValueOptions,
  httpReferrerType,
} from '../../../configurations/@variables/items';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import FormatValue from './formatValue';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const JavaScriptVariable = ({ formIndex, type, table = [] }: Props) => {
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
        value: '',
      });
    }
  }, [fields, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'j') {
      setValue(`forms.${formIndex}.variables.parameter`, [
        {
          type: 'template',
          key: 'name',
          value: '',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {item.key === 'name' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JavaScript Variable</FormLabel>
                  <FormControl>
                    <Input
                      {...register(`forms.${formIndex}.parameter.${index}.type`)}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter a variable type"
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

export default JavaScriptVariable;
