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
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { Checkbox } from '@/src/components/ui/checkbox';

interface Props {
  formIndex: number;
  table?: any;
}

const GoogleTag = ({ formIndex, table = [] }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'template',
        key: 'tagId',
        value: 'G-H9MLDVMFBC',
      });
    }
  }, [fields, append, remove]);

  useEffect(() => {
    if (triggerType === 'googtag') {
      setValue(`forms.${formIndex}.parameter`, [
        {
          type: 'template',
          key: 'tagId',
          value: 'G-H9MLDVMFBC',
        },
      ]);
    }
  }, [triggerType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="items-center mb-3 w-full" key={item.id}>
          {item.key === 'tagId' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {/* 
          {item.key === 'elementId' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Element ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'firingFrequency' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When to fire this trigger</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="ONCE" />
                        </FormControl>
                        <FormLabel className="font-normal">Once per page</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="ONCE_PER_ELEMENT" />
                        </FormControl>
                        <FormLabel className="font-normal">Once per element</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="MANY_PER_ELEMENT" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Every time an element appears on screen
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'onScreenRatio' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Percent Visible</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'useOnScreenDuration' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Checkbox
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? 'true' : 'false');
                      }}
                    />
                  </FormControl>
                  <FormLabel>Set minimum on-screen duration</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'onScreenDuration' && useOnScreenDurationValue === 'true' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>In milliseconds</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'useDomChangeListener' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Checkbox
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? 'true' : 'false');
                      }}
                    />
                  </FormControl>
                  <FormLabel>Observe DOM changes</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )} */}
        </div>
      ))}
    </div>
  );
};

export default GoogleTag;
