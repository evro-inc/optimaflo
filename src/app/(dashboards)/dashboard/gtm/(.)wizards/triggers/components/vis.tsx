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

const VisTrigger = ({ formIndex, table = [] }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  const useOnScreenDurationValue = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  })?.find((field: any) => field.key === 'useOnScreenDuration')?.value;

  useEffect(() => {
    if (fields.length === 0) {
      append({ key: 'selectorType', value: '' });
      append({ key: 'elementId', value: '' });
      append({ type: 'template', key: 'firingFrequency', value: 'ONCE' });
      append({ key: 'useOnScreenDuration', value: 'false' });
      append({ key: 'onScreenDuration', value: '2000' });
      append({ key: 'useDomChangeListener', value: 'false' });
      append({ key: 'onScreenRatio', value: '50' });
    }
  }, [fields, append, remove]);

  useEffect(() => {
    if (triggerType === 'elementVisibility') {
      setValue(`forms.${formIndex}.parameter`, [
        { type: 'template', key: 'selectorType', value: 'ID' },
        { type: 'template', key: 'elementId', value: '' },
        { type: 'template', key: 'firingFrequency', value: 'ONCE' },
        { type: 'template', key: 'onScreenRatio', value: '50' },
        { type: 'boolean', key: 'useOnScreenDuration', value: 'false' },
        { type: 'template', key: 'onScreenDuration', value: '2000' },
        { type: 'boolean', key: 'useDomChangeListener', value: 'false' },
      ]);
    }
  }, [triggerType, setValue, formIndex]);

  useEffect(() => {
    // Debug log
    // Debug log
  }, [fields, useOnScreenDurationValue]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="items-center mb-3 w-full" key={item.id}>
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
          )}
        </div>
      ))}
    </div>
  );
};

export default VisTrigger;
