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
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectValue,
} from '@/src/components/ui/select';
import { Input } from '@/src/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { Switch } from '../../ui/switch';
import { FixedSizeList as List } from 'react-window';

type FieldProps = {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  type?: 'text' | 'select' | 'switch';
  onChange?: (value: string | string[]) => void;
  disabled?: boolean; // Update to handle array as well
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
}) => {
  const { control, register } = useFormContext();

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
              <Input placeholder={placeholder} {...register(name)} {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (type === 'select' && options.length > 0) {
    console.log('options', options);

    const Row = useCallback(
      ({ index, style }) => (
        <div style={style}>
          <SelectItem value={options[index].value}>{options[index].label}</SelectItem>
        </div>
      ),
      [options]
    );
    const listHeight = Math.min(options.length * 35); // Adjust 35 and 200 as needed

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
                    onChange?.(value); // Call custom onChange if provided
                  }
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <List
                    height={listHeight}
                    itemCount={options.length}
                    itemSize={35} // Adjust this based on your option item height
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

  return null;
};
