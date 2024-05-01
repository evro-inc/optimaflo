import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { CardContent, CardHeader } from '@/src/components/ui/card';
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
import { Badge } from '@/src/components/ui/badge';

export default ({
  combinedCategories,
  audienceFormIndex,
  simpleFormIndex,
  cardAndIndex,
  control,
  register,
  watch,
}) => {
  const { fields, remove, append } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses.simpleFilter.simpleCardArray[${simpleFormIndex}].filterExpression.andGroup.filterExpressions.orGroup.filterExpressions`,
  });

  return (
    <div>
      {fields.map((item, index) => {
        const categoryFieldName = `forms[${audienceFormIndex}].filterClauses.simpleFilter.simpleCardArray[${simpleFormIndex}].filterExpression.andGroup.filterExpressions.orGroup.filterExpressions[${index}].dimensionOrMetricFilter.category`;

        const fieldName = `forms[${audienceFormIndex}].filterClauses.simpleFilter.simpleCardArray[${simpleFormIndex}].filterExpression.andGroup.filterExpressions.orGroup.filterExpressions[${index}].dimensionOrMetricFilter.fieldName`;

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
            <div className="relative border-t border-dashed my-8 flex justify-center">
              <div className="absolute -bottom-3 left-5">
                <Badge variant="secondary">OR</Badge>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="flex items-center justify-between mt-5">
                <div className="flex flex-row md:space-x-4 w-full">
                  <div className="w-full">
                    <div className="w-full">
                      <div className="flex space-x-4 w-full">
                        <div className="w-5/12">
                          <FormField
                            control={control}
                            name={categoryFieldName}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {combinedCategories.map((parentCategory) => (
                                        <SelectGroup key={parentCategory.name}>
                                          <SelectLabel>{parentCategory.name}</SelectLabel>
                                          {parentCategory.categories.map((category) => (
                                            <SelectItem
                                              {...register(categoryFieldName)}
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
                                    {...register(fieldName)}
                                    {...field}
                                    disabled={!selectedCategory}
                                    onValueChange={field.onChange}
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
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Cross2Icon className="text-gray-400" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        {inputItem && (
                          <FormField
                            control={control}
                            name={`forms[${simpleFormIndex}].filterClauses[${simpleFormIndex}].parentCardArray[${simpleFormIndex}].simpleFilter.simpleCardArray[${index}].filterExpression.andGroup.filterExpressions[${index}].dimensionOrMetricFilter.${
                              filterTypeMapping[inputItem.apiName] ||
                              filterTypeMapping[inputItem.category] ||
                              'stringFilter'
                            }`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Filter</FormLabel>
                                <FormControl>
                                  {/* Render the appropriate filter input based on the filterType */}
                                  {renderFilterInput(
                                    filterTypeMapping[inputItem.apiName] ||
                                      filterTypeMapping[inputItem.category] ||
                                      'stringFilter',
                                    field,
                                    simpleFormIndex
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        );
      })}
      <Button
        type="button"
        className="flex items-center space-x-2 text-blue-500"
        variant="ghost"
        onClick={() => append({})}
      >
        Or
      </Button>
    </div>
  );
};
