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

const YouTubeTrigger = ({ formIndex }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  const captureProgressValue = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  })?.find((field: any) => field.key === 'captureProgress')?.value;

  const radioButtonGroupValue = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  })?.find((field: any) => field.key === 'radioButtonGroup1')?.value;

  // correct order
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'boolean', key: 'captureStart', value: 'false' });
      append({ type: 'boolean', key: 'captureComplete', value: 'false' });
      append({ type: 'boolean', key: 'capturePause', value: 'false' });
      append({ type: 'boolean', key: 'captureProgress', value: 'false' });
      append({ type: 'template', key: 'radioButtonGroup1', value: 'PERCENTAGE' });
      append({ type: 'template', key: 'progressThresholdsPercent', value: '' });
      append({ type: 'template', key: 'progressThresholdsTimeInSeconds', value: '' }); //Time
      append({ type: 'boolean', key: 'fixMissingApi', value: 'false' });
      append({ type: 'template', key: 'triggerStartOption', value: 'DOM_READY' });
    }
  }, [fields, append]);

  useEffect(() => {
    if (triggerType === 'youTubeVideo') {
      setValue(`forms.${formIndex}.parameter`, [
        { type: 'boolean', key: 'captureStart', value: 'false' },
        { type: 'boolean', key: 'captureComplete', value: 'false' },
        { type: 'boolean', key: 'capturePause', value: 'false' },
        { type: 'boolean', key: 'captureProgress', value: 'false' },
        { type: 'template', key: 'radioButtonGroup1', value: 'PERCENTAGE' },
        { type: 'template', key: 'progressThresholdsPercent', value: '' },
        { type: 'template', key: 'progressThresholdsTimeInSeconds', value: '' }, // time
        { type: 'boolean', key: 'fixMissingApi', value: 'false' },
        { type: 'template', key: 'triggerStartOption', value: 'DOM_READY' },
      ]);
    }
  }, [triggerType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="items-center mb-3 w-full" key={item.id}>
          {item.key === 'captureStart' && (
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
                  <FormLabel>Capture Start</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'captureComplete' && (
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
                  <FormLabel>Capture Complete</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'fixMissingApi' && (
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
                  <FormLabel>Fix Missing API</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'capturePause' && (
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
                  <FormLabel>Capture Pause</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'captureProgress' && (
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
                  <FormLabel>Capture Progress</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'radioButtonGroup1' && captureProgressValue === 'true' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress Measurement</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PERCENTAGE" />
                        </FormControl>
                        <FormLabel className="font-normal">Percentage</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="TIME" />
                        </FormControl>
                        <FormLabel className="font-normal">Time</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'progressThresholdsPercent' &&
            captureProgressValue === 'true' &&
            radioButtonGroupValue === 'PERCENTAGE' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentage Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Percentage value"
                        {...register(`forms.${formIndex}.parameter.${index}.value`)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {item.key === 'progressThresholdsTimeInSeconds' &&
            captureProgressValue === 'true' &&
            radioButtonGroupValue === 'TIME' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Time value"
                        {...register(`forms.${formIndex}.parameter.${index}.value`)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {item.key === 'triggerStartOption' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enable this trigger on:</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Enable trigger on:" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="DOM_READY">DOM Ready</SelectItem>
                          <SelectItem value="WINDOW_LOADED">Window Loaded</SelectItem>
                          <SelectItem value="CONTAINER_LOADED">Container Loaded</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
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

export default YouTubeTrigger;
