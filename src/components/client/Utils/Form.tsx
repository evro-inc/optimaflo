import React from 'react';
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

type FieldProps = {
    name: string;
    label: string;
    description?: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    type?: 'text' | 'select' | 'switch';
    onChange?: (value: string | string[]) => void; // Update to handle array as well
};

export const FormFieldComponent: React.FC<FieldProps> = ({
    name,
    label,
    description,
    placeholder,
    options,
    type = 'text',
    onChange,
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
                            <Input placeholder={placeholder} {...register(name)} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    }

    if (type === 'select' && options) {
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
                                    // For single select, directly set the value
                                    if (field.value !== value) {
                                        field.onChange(value);
                                        onChange?.(value); // Call custom onChange if provided
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>{label}</SelectLabel>
                                        {options.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
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
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    }

    return null;
};
