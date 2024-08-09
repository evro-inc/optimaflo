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

const ScrollDepthTrigger = ({ formIndex }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  const verticalThresholdOn = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  })?.find((field: any) => field.key === 'verticalThresholdOn')?.value;

  const verticalThresholdUnits = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  })?.find((field: any) => field.key === 'verticalThresholdUnits')?.value;

  const horizontalThresholdOn = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  })?.find((field: any) => field.key === 'horizontalThresholdOn')?.value;

  const horizontalThresholdUnits = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  })?.find((field: any) => field.key === 'horizontalThresholdUnits')?.value;

  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'boolean', key: 'verticalThresholdOn', value: 'false' });
      append({ type: 'template', key: 'verticalThresholdUnits', value: 'PERCENT' });
      append({ type: 'template', key: 'verticalThresholdsPercent', value: '' });
      append({ type: 'template', key: 'verticalThresholdsPixels', value: '' });
      append({ type: 'boolean', key: 'horizontalThresholdOn', value: 'false' });
      append({ type: 'template', key: 'horizontalThresholdUnits', value: 'PERCENT' });
      append({ type: 'template', key: 'horizontalThresholdsPercent', value: '' });
      append({ type: 'template', key: 'horizontalThresholdsPixels', value: '' });
      append({ type: 'template', key: 'triggerStartOption', value: 'DOM_READY' });
    }
  }, [fields, append, remove]);

  useEffect(() => {
    if (triggerType === 'scrollDepth') {
      setValue(`forms.${formIndex}.parameter`, [
        { type: 'boolean', key: 'verticalThresholdOn', value: 'false' },
        { type: 'template', key: 'verticalThresholdUnits', value: 'PERCENT' },
        { type: 'template', key: 'verticalThresholdsPercent', value: '' },
        { type: 'template', key: 'verticalThresholdsPixels', value: '' },
        { type: 'boolean', key: 'horizontalThresholdOn', value: 'false' },
        { type: 'template', key: 'horizontalThresholdUnits', value: 'PERCENT' },
        { type: 'template', key: 'horizontalThresholdsPercent', value: '' },
        { type: 'template', key: 'horizontalThresholdsPixels', value: '' },
        { type: 'template', key: 'triggerStartOption', value: 'DOM_READY' },
      ]);
    }
  }, [triggerType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="items-center mb-3 w-full" key={item.id}>
          {/* Vertical Scroll Depth Fields */}
          {item.key === 'verticalThresholdOn' && (
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
                  <FormLabel>Vertical Scroll Depth</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'verticalThresholdUnits' && verticalThresholdOn === 'true' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Units</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PERCENT" />
                        </FormControl>
                        <FormLabel className="font-normal">Percentages</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PIXELS" />
                        </FormControl>
                        <FormLabel className="font-normal">Pixels</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'verticalThresholdsPercent' &&
            verticalThresholdOn === 'true' &&
            verticalThresholdUnits === 'PERCENT' && (
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

          {item.key === 'verticalThresholdsPixels' &&
            verticalThresholdOn === 'true' &&
            verticalThresholdUnits === 'PIXELS' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pixels Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Pixels value"
                        {...register(`forms.${formIndex}.parameter.${index}.value`)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {/* Horizontal Scroll Depth Fields */}
          {item.key === 'horizontalThresholdOn' && (
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
                  <FormLabel>Horizontal Scroll Depth</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'horizontalThresholdUnits' && horizontalThresholdOn === 'true' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Units</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PERCENT" />
                        </FormControl>
                        <FormLabel className="font-normal">Percentages</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PIXELS" />
                        </FormControl>
                        <FormLabel className="font-normal">Pixels</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'horizontalThresholdsPercent' &&
            horizontalThresholdOn === 'true' &&
            horizontalThresholdUnits === 'PERCENT' && (
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

          {item.key === 'horizontalThresholdsPixels' &&
            horizontalThresholdOn === 'true' &&
            horizontalThresholdUnits === 'PIXELS' && (
              <FormField
                control={control}
                name={`forms.${formIndex}.parameter.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pixels Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Pixels value"
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

export default ScrollDepthTrigger;
