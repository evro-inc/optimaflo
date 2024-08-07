import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
import { Checkbox } from '@/src/components/ui/checkbox';

interface Props {
  formIndex: number;
  table?: any;
}

const CustomEventTrigger = ({ formIndex, table = [] }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.customEventFilter`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  useEffect(() => {
    if (fields.length === 0) {
      append([
        {
          type: 'equals',
          parameter: [
            {
              type: 'template',
              key: 'arg0',
              value: '{{_event}}',
            },
            {
              type: 'template',
              key: 'arg1',
              value: '',
            },
          ],
        },
      ]);
    }
  }, [fields, append, remove]);

  useEffect(() => {
    if (triggerType === 'customEvent') {
      setValue(`forms.${formIndex}.customEventFilter`, [
        {
          type: 'equals',
          parameter: [
            {
              type: 'template',
              key: 'arg0',
              value: '{{_event}}',
            },
            {
              type: 'template',
              key: 'arg1',
              value: '',
            },
          ],
        },
      ]);
    }
  }, [triggerType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="items-center mb-3 w-full" key={item.id}>
          <div className="col-span-1">
            <FormField
              key={item.id}
              control={control}
              name={`forms.${formIndex}.customEventFilter.${index}.parameter.1.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(
                        `forms.${formIndex}.customEventFilter.${index}.parameter.1.value`
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="col-span-1">
            <FormField
              control={control}
              name={`forms.${formIndex}.customEventFilter.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Checkbox
                      {...field}
                      checked={field.value === 'matchRegex'}
                      onCheckedChange={(checked) =>
                        setValue(
                          `forms.${formIndex}.customEventFilter.${index}.type`,
                          checked ? 'matchRegex' : 'equals'
                        )
                      }
                    />
                  </FormControl>
                  <FormLabel>Use regex matching</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomEventTrigger;
