import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { fetchAllTriggers } from '../../../configurations/@triggers/items';

interface Props {
  formIndex: number;
  table?: any;
}

const FiringTriggerComponent = ({ formIndex, table = [] }: Props) => {
  const [cachedTriggers, setCachedTriggers] = useState<any[]>([]);
  const { control, setValue } = useFormContext();
  const { fields: firingField, append: firingAppend, remove: firingRemove } = useFieldArray({
    control,
    name: `forms.${formIndex}.firingTriggerId`,
  });

  const { fields: blockingField, append: blockingAppend, remove: blockingRemove } = useFieldArray({
    control,
    name: `forms.${formIndex}.blockingTriggerId`,
  });

  useEffect(() => {
    // Fetch data and set cached triggers
    const fetchAllTriggerData = async () => {
      try {
        const data = await fetchAllTriggers();
        const allTriggers = data.map((t) => ({
          ...t,
        }));

        setCachedTriggers(allTriggers);
      } catch (error) {
        console.error('Error fetching all triggers:', error);
      }
    };

    fetchAllTriggerData();
  }, []);

  const handleSelectChange = (field: any, value: any) => {
    field.onChange(value);
  };

  return (
    <form className="space-y-4">
      {firingField.map((item: any, index: number) => (
        <div className="grid grid-cols-2 gap-4" key={item.id}>
          <FormField
            control={control}
            name={`forms.${formIndex}.firingTriggerId.${index}`}
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormLabel>Firing Trigger</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={(value) => handleSelectChange(field, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="None">None</SelectItem>
                        {cachedTriggers.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            {tag.name}
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
          <Button type="button" onClick={() => firingRemove(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        className="mt-5"
        onClick={() => firingAppend({})}
      >
        Add Firing Trigger
      </Button>

      {blockingField.map((item: any, index: number) => (
        <div className="grid grid-cols-2 gap-4" key={item.id}>
          <FormField
            control={control}
            name={`forms.${formIndex}.blockingTriggerId.${index}`}
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormLabel>Blocking Trigger</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={(value) => handleSelectChange(field, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="None">None</SelectItem>
                        {cachedTriggers.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            {tag.name}
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
          <Button type="button" onClick={() => blockingRemove(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        className="mt-5"
        onClick={() => blockingAppend({})}
      >
        Add Blocking Trigger
      </Button>
    </form>
  );
};

export default FiringTriggerComponent;
