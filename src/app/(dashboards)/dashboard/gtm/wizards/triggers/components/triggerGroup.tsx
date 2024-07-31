import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Button } from '@/src/components/ui/button';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { fetchAllTriggers } from '../../../configurations/@triggers/items';

interface Props {
  formIndex: number;
  table?: any;
}

const TriggerGroup = ({ formIndex, table = [] }: Props) => {
  const [cachedTriggers, setCachedTriggers] = useState<any[]>([]);
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter[0].list`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'triggerReference',
        value: cachedTriggers.length > 0 ? cachedTriggers[0].id : '',
      });
    }
  }, [fields, append, cachedTriggers]);

  useEffect(() => {
    if (triggerType === 'triggerGroup') {
      setValue(`forms.${formIndex}.parameter`, [
        {
          type: 'list',
          key: 'triggerIds',
          list:
            fields.length > 0
              ? fields
              : [
                  {
                    type: 'triggerReference',
                    value: cachedTriggers.length > 0 ? cachedTriggers[0].id : '',
                  },
                ],
        },
      ]);
    }
  }, [triggerType, setValue, formIndex, cachedTriggers, fields]);

  const conditionButtonClick = () => {
    append({
      type: 'triggerReference',
      value: cachedTriggers.length > 0 ? cachedTriggers[0].id : '',
    });
  };

  useEffect(() => {
    const fetchAllTriggerData = async () => {
      try {
        const data = await fetchAllTriggers();
        const wrappedData = data.map((trigger) => ({
          ...trigger,
          name: `${trigger.name}`,
        }));
        setCachedTriggers(wrappedData);
      } catch (error) {
        console.error('Error fetching all triggers:', error);
      }
    };

    fetchAllTriggerData();
  }, []);

  return (
    <div>
      {fields.map((item, index) => (
        <div className="grid grid-cols-4 gap-4 items-center my-3" key={item.id}>
          <div className="col-span-1">
            <FormField
              key={item.id}
              control={control}
              name={`forms.${formIndex}.parameter[0].list[${index}].value`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      {...register(`forms.${formIndex}.parameter[0].list[${index}].value`)}
                      {...field}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trigger." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Trigger</SelectLabel>
                          {cachedTriggers.map((trigger) => (
                            <SelectItem key={trigger.id} value={trigger.id}>
                              {trigger.name}
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

          {index > 0 && (
            <Button
              type="button"
              onClick={() => {
                remove(index);
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

export default TriggerGroup;
