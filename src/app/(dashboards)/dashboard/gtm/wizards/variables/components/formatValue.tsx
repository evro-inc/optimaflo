import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { formatValueOptions, caseConversionTypes } from '../../../configurations/@variables/items';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

interface Props {
  formIndex: number;
}

const FormatValue = ({ formIndex }: Props) => {
  const { control, setValue, register } = useFormContext();

  return (
    <div className="py-3">
      {formatValueOptions.map((option) => (
        <FormField
          key={option.name}
          control={control}
          name={`forms.${formIndex}.formatValue.${option.name}`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue(`forms.${formIndex}.formatValue.${option.name}`, {
                        type: 'template',
                        value: '',
                      });
                    } else {
                      setValue(`forms.${formIndex}.formatValue.${option.name}`, undefined);
                    }
                  }}
                />
              </FormControl>
              <FormLabel>{option.label}</FormLabel>
              {field.value && (
                <FormControl>
                  <Input
                    {...register(`forms.${formIndex}.formatValue.${option.name}.value`)}
                    placeholder={`Enter ${option.label} value`}
                    value={field.value.value} // Access the nested value property
                    onChange={(e) => field.onChange({ ...field.value, value: e.target.value })} // Update the nested value
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ))}

      <FormField
        control={control}
        name={`forms.${formIndex}.formatValue.caseConversionType`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Case Conversion Type</FormLabel>
            <FormControl>
              <Select
                value={field.value || 'none'}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a case conversion type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Case Conversion Types</SelectLabel>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="uppercase">Uppercase</SelectItem>
                    <SelectItem value="lowercase">Lowercase</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default FormatValue;
