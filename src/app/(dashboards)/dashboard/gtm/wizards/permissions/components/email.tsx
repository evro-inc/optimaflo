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

export default ({ formIndex, control, register, getValues, setValue }) => {
    const { fields, remove, append } = useFieldArray({
        control,
        name: `forms.${formIndex}.emailAddresses`,
    });

    return (
        <div>
            <FormLabel>Email Address:</FormLabel>
            <FormDescription>Which email address do you want to provide access to.</FormDescription>
            {fields.map((item, index) => {
                const currentEmailAddress = getValues(`forms.${formIndex}.emailAddresses.${index}.emailAddress`);
                if (currentEmailAddress) {
                    setValue(`forms.${formIndex}.permissions.${index}.emailAddress`, currentEmailAddress || '');
                }

                console.log("formIndex", formIndex);
                console.log("index", index);


                return (
                    <div className='py-3' key={item.id}>
                        <FormField
                            control={control}
                            name={`forms.${formIndex}.emailAddresses.${index}.emailAddress`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center space-x-4">
                                        <FormControl className="flex-grow">
                                            <Input
                                                {...register(`forms.${formIndex}.emailAddresses.${index}.emailAddress`)}
                                                placeholder="Email Address"
                                            />
                                        </FormControl>
                                        <Button type="button" onClick={() => remove(index)}>
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
