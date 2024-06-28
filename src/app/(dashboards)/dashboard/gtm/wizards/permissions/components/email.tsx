import { Button } from '@/src/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

type FieldItem = {
    id: string;
    emailAddress?: string;
};

export default () => {
    const { control, register, getValues, setValue } = useFormContext();
    const { fields, remove, append } = useFieldArray({
        control,
        name: `emailAddresses`,
    });

    return (
        <div>
            <FormLabel>Email Address:</FormLabel>
            <FormDescription>Which email address do you want to provide access to.</FormDescription>
            {fields.map((item: FieldItem, k) => {
                const currentEmailAddress = getValues(`emailAddresses.${k}.emailAddress`);
                if (currentEmailAddress) {
                    setValue(`permissions.${k}.emailAddress`, currentEmailAddress || '');
                }

                return (
                    <div className='py-3'>
                        <FormField
                            control={control}
                            name={`emailAddresses.${k}.emailAddress`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center space-x-4" key={item.id}>
                                        <FormControl className="flex-grow">
                                            <Input
                                                {...register(`emailAddresses.${k}.emailAddress`)}
                                                placeholder="Email Address"
                                            />
                                        </FormControl>
                                        <Button type="button" onClick={() => remove(k)}>
                                            <MinusIcon />
                                        </Button>
                                    </div>

                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                );
            })}

            <Button
                className="mt-4"
                type="button"
                onClick={() =>
                    append({
                        emailAddress: '',
                    })
                }
            >
                <PlusIcon /> Email
            </Button>
        </div>
    );
};
