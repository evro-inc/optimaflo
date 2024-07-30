import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { filterType } from '../../../configurations/@triggers/items';
import { Button } from '@/src/components/ui/button';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';

interface Props {
  formIndex: number;
  table?: any;
}

const LinkClickTrigger = ({ formIndex, table = [] }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.autoEventFilter`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  const waitForTags = useWatch({
    control,
    name: `forms.${formIndex}.waitForTags.value`,
  });

  const checkValidation = useWatch({
    control,
    name: `forms.${formIndex}.checkValidation.value`,
  });

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: "contains",
        parameter: [
          {
            type: "template",
            key: "arg0",
            value: ""
          },
          {
            type: "template",
            key: "arg1",
            value: ""
          }
        ]
      });
    } else if (fields.length > 4) {
      remove(fields.length - 1);
    }
  }, [fields, append, remove]);

  useEffect(() => {
    if (triggerType === 'linkClick') {
      setValue(`forms.${formIndex}.autoEventFilter`, [
        {
          type: "contains",
          parameter: [
            {
              type: "template",
              key: "arg0",
              value: ""
            },
            {
              type: "template",
              key: "arg1",
              value: ""
            }
          ]
        }
      ]);

      setValue(`forms.${formIndex}.waitForTags`, {
        type: "boolean",
        value: "false"
      });

      setValue(`forms.${formIndex}.checkValidation`, {
        type: "boolean",
        value: "false"
      });

      setValue(`forms.${formIndex}.waitForTagsTimeout`, {
        type: "template",
        value: ""
      });
    }
  }, [triggerType, setValue, formIndex]);

  const wrapValueWithBraces = (value) => {
    if (!value.startsWith('{{') && !value.endsWith('}}')) {
      return `{{${value}}}`;
    }
    return value;
  };

  const addRow = () => {
    append({
      type: "contains",
      parameter: [
        {
          type: "template",
          key: "arg0",
          value: ""
        },
        {
          type: "template",
          key: "arg1",
          value: ""
        }
      ]
    });
  };

  return (
    <div>
      <FormField
        control={control}
        name={`forms.${formIndex}.waitForTags.value`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Wait for Tags</FormLabel>
            <FormControl>
              <Checkbox
                {...field}
                checked={field.value === 'true'}
                onCheckedChange={(checked) =>
                  setValue(
                    `forms.${formIndex}.waitForTags.value`,
                    checked ? 'true' : 'false'
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {waitForTags === 'true' && (
        <FormField
          control={control}
          name={`forms.${formIndex}.waitForTagsTimeout.value`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wait for Tags Timeout</FormLabel>
              <FormControl>
                <Input
                  placeholder="Timeout"
                  {...register(`forms.${formIndex}.waitForTagsTimeout.value`)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name={`forms.${formIndex}.checkValidation.value`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Check Validation</FormLabel>
            <FormControl>
              <Checkbox
                {...field}
                checked={field.value === 'true'}
                onCheckedChange={(checked) =>
                  setValue(
                    `forms.${formIndex}.checkValidation.value`,
                    checked ? 'true' : 'false'
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {fields.map((item: any, index: number) => (
        <div className="grid grid-cols-4 gap-4 items-center mb-3" key={item.id}>
          {(waitForTags === 'true' || checkValidation === 'true') && (
            <>
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
                    remove(index);
                    // Dispatch an action to remove the entity from Redux store if needed
                  }}
                  className="h-10"
                >
                  <MinusIcon />
                </Button>
              )}
            </>
          )}
        </div>
      ))}

      {(waitForTags === 'true' || checkValidation === 'true') && (
        <Button className="mt-4" type="button" onClick={addRow}>
          <PlusIcon /> Add
        </Button>
      )}
    </div>
  );
};

export default LinkClickTrigger;
