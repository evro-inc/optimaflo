import React, { useCallback } from 'react';
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
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/src/components/ui/select';
import { Input } from '@/src/components/ui/input';
import { useFormContext, useWatch } from 'react-hook-form';
import { Switch } from '../../ui/switch';
import { FixedSizeList as List } from 'react-window';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import MultipleSelector, { Option } from '../../ui/multi-select';

type FieldProps = {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  options?: Option[];
  type?: 'text' | 'select' | 'switch' | 'radio' | 'multiSelect';
  onChange?: (value: string | string[]) => void;
  disabled?: boolean;
  conditionalFields?: {
    dependsOn: string; // Name of the field it depends on
  };
};

export const FormFieldComponent: React.FC<FieldProps> = ({
  name,
  label,
  description,
  placeholder,
  options = [],
  type = 'text',
  onChange,
  disabled = false,
  conditionalFields,
}) => {
  const { control, register, setValue } = useFormContext();

  // Use useWatch to track dependency if provided
  const dependsOnValue = conditionalFields?.dependsOn
    ? useWatch({ control, name: conditionalFields.dependsOn })
    : undefined;

  const computedDisabled = disabled || (conditionalFields?.dependsOn && !dependsOnValue);

  if (type === 'text') {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
            <FormControl>
              <Input
                placeholder={placeholder}
                {...register(name)}
                {...field}
                disabled={computedDisabled}
                onChange={(e) => {
                  const value = e.target.value;

                  // If this is a numeric field, apply specific parsing logic
                  if (name.includes('defaultValue.numericValue')) {
                    const parsedValue = parseFloat(value);
                    field.onChange(isNaN(parsedValue) ? undefined : parsedValue);
                  } else {
                    // For all other fields, use the value directly
                    field.onChange(value);
                  }

                  // Call custom onChange handler if provided
                  onChange?.(value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (type === 'select') {
    const Row = useCallback(
      ({ index, style }) => (
        <div style={style}>
          <SelectItem value={options[index].value}>{options[index].label}</SelectItem>
        </div>
      ),
      [options]
    );
    const listHeight = Math.min(options.length * 35); // Adjust as needed

    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
            <FormControl>
              <Select
                {...field}
                onValueChange={(value) => {
                  if (field.value !== value) {
                    field.onChange(value);
                    setValue(name, value);
                    onChange?.(value);
                  }
                }}
                disabled={computedDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <List
                    height={listHeight}
                    itemCount={options.length}
                    itemSize={35} // Adjust based on your option item height
                    width="100%"
                  >
                    {Row}
                  </List>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (type === 'switch') {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (type === 'radio') {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
            <FormControl>
              <RadioGroup
                {...field}
                onValueChange={(value) => {
                  field.onChange(value);
                  onChange?.(value);
                }}
                disabled={computedDisabled}
                className="flex flex-col space-y-1"
              >
                {options.map((option) => (
                  <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={option.value} />
                    </FormControl>
                    <FormLabel className="font-normal">{option.label}</FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (type === 'multiSelect') {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => {
          const handleChange = (selectedOptions: Option[]) => {
            // Extract the values from the selected options
            const values = selectedOptions.map((option) => option.value);
            field.onChange(values);
            onChange?.(values);
          };

          return (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              {description && <FormDescription>{description}</FormDescription>}
              <FormControl>
                <MultipleSelector
                  {...field}
                  value={
                    Array.isArray(field.value) && field.value.length > 0
                      ? options.filter((opt) => field.value.includes(opt.value))
                      : [] // Ensure the selected options are being displayed properly
                  }
                  onChange={handleChange} // Handle change and update form state
                  defaultOptions={options}
                  placeholder="Select variables."
                  emptyIndicator={
                    <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                      No results found.
                    </p>
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  return null;
};
