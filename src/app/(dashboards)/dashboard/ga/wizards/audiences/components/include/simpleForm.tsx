import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
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
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { filterTypeMapping, renderFilterInput } from '../../../../properties/@audiences/items';
import OrForm from './simpleOrForm';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { MatchType, StringFilter } from '@/src/types/types';

export default ({
  combinedCategories,
  audienceFormIndex,
  simpleFormIndex,
  control,
  register,
  watch,
}) => {
  const base = `forms[${audienceFormIndex}].filterClauses[${simpleFormIndex}].simpleFilter.filterExpression.andGroup.filterExpressions`;

  const { fields, remove, append } = useFieldArray({
    control,
    name: base,
  });

  return (
    <div>
      {fields.map((item, cardAndIndex) => {
        /*         console.log('item data', item);
                console.log('cardAndIndex data', cardAndIndex);
                console.log('fields data', fields); */

        const baseField = `${base}[${cardAndIndex}].orGroup.filterExpressions[${cardAndIndex}].dimensionOrMetricFilter`;

        const categoryFieldName = `${baseField}.category`;

        const fieldName = `${baseField}.fieldName`;

        // Watch the specific category and item for this field
        const selectedCategory = watch(categoryFieldName);
        const selectedItem = watch(fieldName);

        const flattenedCategories = combinedCategories.flatMap((parentCategory) =>
          parentCategory.categories.map((category) => ({
            ...category,
            parentName: parentCategory.name,
            id: `${parentCategory.name} - ${category.name}`,
          }))
        );

        const inputCategory = flattenedCategories.find(
          (category) => category.id === selectedCategory
        );
        const inputItem = inputCategory?.items.find((item) => item.apiName === selectedItem);

        return (
          <div key={item.id}>
            {cardAndIndex > 0 && (
              <div className="w-10 flex flex-col items-center justify-center space-y-2">
                <div className="h-2">
                  <Separator orientation="vertical" />
                </div>
                <Badge variant="secondary">AND</Badge>
                <div className="h-2">
                  <Separator orientation="vertical" />
                </div>
              </div>
            )}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mt-5">
                  <div className="flex flex-row md:space-x-4 w-full">
                    <div className="w-full">
                      {/* <div className="w-full">
                        <div className="flex space-x-4 w-full">
                          <div className="w-5/12">
                            <FormField
                              control={control}
                              name={categoryFieldName}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select
                                      {...register(categoryFieldName, { required: true })}
                                      defaultValue={field.value}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {combinedCategories.map((parentCategory) => (
                                          <SelectGroup key={parentCategory.name}>
                                            <SelectLabel>{parentCategory.name}</SelectLabel>
                                            {parentCategory.categories.map((category) => (
                                              <SelectItem
                                                key={`${parentCategory.name} - ${category.name}`}
                                                value={`${parentCategory.name} - ${category.name}`}
                                              >
                                                {category.name}
                                              </SelectItem>
                                            ))}
                                          </SelectGroup>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="w-5/12">
                            <FormField
                              control={control}
                              name={fieldName}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select
                                      {...register(fieldName, { required: true })}
                                      disabled={!selectedCategory}

                                      defaultValue={field.value}
                                    >
                                      <SelectTrigger className="truncate">
                                        <SelectValue placeholder="Select Item" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {inputCategory?.items.map((item: any) => (
                                          <SelectItem key={item.apiName} value={item.apiName}>
                                            {item.uiName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="w-1/12">
                            <Button
                              type="button"
                              className="flex items-center space-x-2"
                              onClick={() => remove(cardAndIndex)}
                            >
                              <Cross2Icon className="text-white" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          {inputItem &&
                            renderFilterInput(
                              'stringFilter',
                              audienceFormIndex,
                              simpleFormIndex,
                              cardAndIndex,
                              'andGroup'
                            )}
                        </div>
                      </div> */}

                      {/* ///////////////////////////////////////////////// OR FIELDS/////////////////////////////////////////////// */}
                      <OrForm
                        combinedCategories={combinedCategories}
                        audienceFormIndex={audienceFormIndex}
                        simpleFormIndex={simpleFormIndex}
                        cardAndIndex={cardAndIndex}
                        control={control}
                        register={register}
                        watch={watch}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
      <div className="mt-5 flex items-center space-x-4">
        <Button
          type="button"
          className="flex items-center space-x-2"
          onClick={() =>
            append({
              orGroup: {
                filterExpressions: [
                  {
                    dimensionOrMetricFilter: {
                      fieldName: '',
                      atAnyPointInTime: false,
                      inAnyNDayPeriod: 0,
                      stringFilter: {
                        matchType: MatchType.Exact,
                        value: '',
                        caseSensitive: false,
                      },
                    },
                  },
                ],
              },
            })
          }
        >
          <PlusIcon className="text-white" />
          <span>Add Card</span>
        </Button>
      </div>
    </div>
  );
};
