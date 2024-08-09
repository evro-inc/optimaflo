'use client';
import { Button } from '@/src/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import { MinusIcon, PlusIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { fetchAllVariables } from '../../../configurations/@variables/items';
import { filterType } from '../../../configurations/@triggers/items';
import { Input } from '@/src/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';

const FiringOnTrigger = ({ formIndex }) => {
  const { control, register } = useFormContext();
  const { fields, remove, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.filter`,
  });
  const [, setCachedVariables] = useState<any[]>([]);

  const selectedPages = useWatch({
    control,
    name: `forms.${formIndex}.selectedPages`,
  });

  useEffect(() => {
    const fetchAllVariablesData = async () => {
      try {
        const data = await fetchAllVariables();
        // Debugging log
        // Wrap each variable name in double curly braces
        const wrappedData = data.map((variable) => ({
          ...variable,
          name: `{{${variable.name}}}`,
        }));
        setCachedVariables(wrappedData);
      } catch (error) {
        console.error('Error fetching all variables:', error);
      }
    };

    fetchAllVariablesData();
  }, []);

  const entityButtonClick = () => {
    append({
      type: 'contains',
      parameter: [
        {
          type: 'template',
          key: 'arg0',
          value: '',
        },
        {
          type: 'template',
          key: 'arg1',
          value: '',
        },
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
      <FormLabel>This trigger fires on</FormLabel>
      <FormField
        control={control}
        name={`forms.${formIndex}.selectedPages`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex space-x-4"
              >
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="all" id="all-pages" />
                  </FormControl>
                  <FormLabel htmlFor="all-pages">All</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="some" id="some-pages" />
                  </FormControl>
                  <FormLabel htmlFor="some-pages">Some</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedPages === 'some' && (
        <>
          <FormLabel>
            Fire this trigger when an Event occurs and all of these conditions are true:
          </FormLabel>
          <div className="grid grid-cols-4 gap-4 pt-2">
            <FormLabel className="col-span-1">
              Variable
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <QuestionMarkCircledIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      The variable type must be a valid and recognized type within the entity where
                      you are attempting to create the variable.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
            <FormLabel className="col-span-1">Condition</FormLabel>
            <FormLabel className="col-span-1">Value</FormLabel>
          </div>

          {fields.map((item, index) => {
            return (
              <div className="grid grid-cols-4 gap-4 items-center mb-3" key={item.id}>
                <div className="col-span-1">
                  <FormField
                    key={item.id}
                    control={control}
                    name={`forms.${formIndex}.filter.${index}.parameter.0.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="value"
                            {...register(`forms.${formIndex}.filter.${index}.parameter.0.value`)}
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
                    name={`forms.${formIndex}.filter.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            {...register(`forms.${formIndex}.filter.${index}.type`)}
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
                    name={`forms.${formIndex}.filter.${index}.parameter.1.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="value"
                            {...register(`forms.${formIndex}.filter.${index}.parameter.1.value`)}
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
              </div>
            );
          })}
          <Button className="mt-4" type="button" onClick={entityButtonClick}>
            <PlusIcon /> Add Condition
          </Button>
        </>
      )}
    </div>
  );
};

export default FiringOnTrigger;
