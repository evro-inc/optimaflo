import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { filterType } from '../../../configurations/@triggers/items';

interface Props {
  formIndex: number;
  table?: any;
}

const TimerTrigger = ({ formIndex }: Props) => {
  const { control, register, setValue } = useFormContext();
  const {
    fields: autoEventFields,
    append: appendAutoEvent,
    remove: removeAutoEvent,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.autoEventFilter`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  useEffect(() => {
    if (autoEventFields.length === 0) {
      appendAutoEvent({
        type: 'contains',
        parameter: [
          { type: 'template', key: 'arg0', value: '{{Container ID}}' },
          { type: 'template', key: 'arg1', value: 'jj' },
        ],
      });
    } else if (autoEventFields.length > 1) {
      removeAutoEvent(1, autoEventFields.length - 1); // Ensure only one is appended
    }
  }, [autoEventFields, appendAutoEvent, removeAutoEvent]);

  useEffect(() => {
    if (triggerType === 'timer') {
      setValue(`forms.${formIndex}.eventName`, { type: 'template', value: 'gtm.timer' });
      setValue(`forms.${formIndex}.interval`, { type: 'template', value: '5' });
      setValue(`forms.${formIndex}.limit`, { type: 'template', value: '545' });
    }
  }, [triggerType, setValue, formIndex]);

  const conditionButtonClick = () => {
    appendAutoEvent({
      type: 'contains',
      parameter: [
        { type: 'template', key: 'arg0', value: '{{Container ID}}' },
        { type: 'template', key: 'arg1', value: 'jj' },
      ],
    });
  };

  const wrapValueWithBraces = (value) => {
    if (!value.startsWith('{{') && !value.endsWith('}}')) {
      return `{{${value}}}`;
    }
    return value;
  };

  return (
    <div>
      <FormField
        control={control}
        name={`forms.${formIndex}.eventName.value`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Name</FormLabel>
            <FormControl>
              <Input placeholder="Event Name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`forms.${formIndex}.interval.value`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Interval</FormLabel>
            <FormControl>
              <Input placeholder="Interval" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`forms.${formIndex}.limit.value`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit</FormLabel>
            <FormControl>
              <Input placeholder="Limit" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {autoEventFields.map((item, index) => (
        <div className="grid grid-cols-4 gap-4 items-center my-3" key={item.id}>
          <div className="col-span-1">
            <FormField
              key={item.id}
              control={control}
              name={`forms.${formIndex}.autoEventFilter.${index}.parameter.0.value`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.autoEventFilter.${index}.parameter.0.value`)}
                      {...field}
                      value={wrapValueWithBraces(field.value || '')}
                      onChange={(e) => field.onChange(wrapValueWithBraces(e.target.value))}
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
              name={`forms.${formIndex}.autoEventFilter.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      {...register(`forms.${formIndex}.autoEventFilter.${index}.type`)}
                      {...field}
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a condition type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {filterType.map((data) => (
                            <SelectItem key={data.type} value={data.type}>
                              {data.name}
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
          </div>

          <div className="col-span-1">
            <FormField
              key={item.id}
              control={control}
              name={`forms.${formIndex}.autoEventFilter.${index}.parameter.1.value`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.autoEventFilter.${index}.parameter.1.value`)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {index > 0 && (
            <Button
              type="button"
              onClick={() => {
                removeAutoEvent(index);
              }}
              className="h-10"
            >
              <MinusIcon />
            </Button>
          )}
        </div>
      ))}

      <Button className="mt-4" type="button" onClick={conditionButtonClick}>
        <PlusIcon /> Add
      </Button>
    </div>
  );
};

export default TimerTrigger;
