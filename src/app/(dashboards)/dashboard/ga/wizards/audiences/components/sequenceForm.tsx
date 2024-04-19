import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import {
  PlusIcon,
  BarChartIcon,
  Cross2Icon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  CircleIcon,
  ClockIcon,
  ValueNoneIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { simpleFilterExpression, SimpleScope } from '../../../properties/@audiences/items';
import CardForm from './cardForm';
import { AudienceClauseType, AudienceFilterScope } from '@/src/types/types';

export default function SequenceForm({
  combinedCategories,
  audienceFormIndex,
  control,
  register,
  watch,
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${audienceFormIndex}.filterClauses`,
  });

  return (
    <>
      <ul>
        {fields.map((item, index) => {
          return (
            <li key={item.id}>
              {index > 0 && (
                <div className="w-10 flex flex-col items-center justify-center space-y-2">
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                  <Badge variant="secondary">AND</Badge>
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                </div>
              )}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <CircleIcon className="text-blue-500 mr-2" />
                    <span className="flex-grow text-sm font-medium">Include users when:</span>
                    <div className="flex items-center space-x-2">
                      <PersonIcon className="text-gray-600" />
                      <FormField
                        control={control}
                        name={`forms.[${audienceFormIndex}].filterClauses.parentCardArray[${index}].simpleFilter.simpleCardArray[${index}].scope`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select
                                {...register(
                                  `forms.[${audienceFormIndex}].filterClauses.parentCardArray[${index}].simpleFilter.simpleCardArray[${index}].scope`
                                )}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger id="user-action">
                                  <SelectValue placeholder="Condition scoping" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {SimpleScope.map((item) => (
                                    <SelectItem key={item.label} value={item.id}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator orientation="vertical" />
                      <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                        <TrashIcon className="text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <CardForm
                    audienceFormIndex={audienceFormIndex}
                    combinedCategories={combinedCategories}
                    simpleFormIndex={index}
                    {...{ control, register, watch }}
                  />
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <section>
        <Button
          className="flex items-center space-x-2"
          variant="secondary"
          onClick={() => {
            append({
              name: 'new condition group',
              parentCardArray: [
                {
                  clauseType: AudienceClauseType.UNSPECIFIED,
                  simpleFilter: {
                    name: 'new simple filter',
                    simpleCardArray: [
                      {
                        scope: AudienceFilterScope.UNSPECIFIED,
                        filterExpression: simpleFilterExpression,
                      },
                    ],
                  },
                },
              ],
            });
          }}
        >
          <PlusIcon className="text-white" />
          <span>Add condition group to include</span>
        </Button>
      </section>
    </>
  );
}
