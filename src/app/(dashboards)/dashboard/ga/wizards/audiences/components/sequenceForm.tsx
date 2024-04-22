import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
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
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import {
  renderFilterInput,
  sequenceStepFilterExpression,
} from '../../../properties/@audiences/items';
import OrForm from './sequenceOrForm';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { AudienceFilterScope } from '@/src/types/types';

export default ({
  combinedCategories,
  audienceFormIndex,
  sequenceFormIndex,
  sequenceStepIndex,
  removeSequence,
  removeStep,
  control,
  register,
  watch,
}) => {
  const { fields, remove, append } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses.sequenceFilter[${sequenceFormIndex}].sequenceSteps[${sequenceStepIndex}].filterExpression`,
  });


  return (
    <div>
      {fields.map((item, cardAndIndex) => {
        const categoryFieldName = `forms[${audienceFormIndex}].filterClauses.sequenceFilter.sequenceSteps[${sequenceStepIndex}].filterExpression.andGroup.filterExpressions[${cardAndIndex}].dimensionOrMetricFilter.category`;

        const fieldName = `forms[${audienceFormIndex}].filterClauses.sequenceFilter.sequenceSteps[${sequenceStepIndex}].filterExpression.andGroup.filterExpressions[${cardAndIndex}].dimensionOrMetricFilter.fieldName`;

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

        const removeStepSequence = (cardIndex: number) => {
          remove(cardIndex);
          if (fields.length === 1) {
            removeStep(sequenceStepIndex);
            removeSequence(sequenceFormIndex);
          }
        };


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
                    <div>
                      <div>
                        <div className="flex space-x-4">
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
                                    <SelectTrigger className="truncate w-[200px]">
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
                          <Button
                            className="flex items-center space-x-2"
                            onClick={() => removeStepSequence(cardAndIndex)}
                          >
                            <Cross2Icon className="text-white" />
                          </Button>
                        </div>
                        <div>
                          {inputItem && (
                            <FormField
                              control={control}
                              name={`forms[${audienceFormIndex}].filterClauses[${sequenceFormIndex}].parentCardArray[${sequenceFormIndex}].simpleFilter.simpleCardArray[${cardAndIndex}].filterExpression.andGroup.filterExpressions[${cardAndIndex}].dimensionOrMetricFilter.${filterTypeMapping[inputItem.apiName] ||
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
                                      sequenceFormIndex
                                    )}
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>

                      {/* ///////////////////////////////////////////////// OR FIELDS/////////////////////////////////////////////// */}
                      <OrForm
                        combinedCategories={combinedCategories}
                        audienceFormIndex={audienceFormIndex}
                        sequenceFormIndex={sequenceFormIndex}
                        sequenceStepIndex={sequenceStepIndex}
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
          className="flex items-center space-x-2"
          onClick={() =>
            append({
              scope: AudienceFilterScope.WITHIN_SAME_EVENT, // Default scope
              immediatelyFollows: false, // Default value for immediatelyFollows
              constraintDuration: '', // Default value for constraintDuration
              filterExpression: sequenceStepFilterExpression, // Default filterExpression structure
            })
          }
        >
          <PlusIcon className="text-white" />
          <span>Add Card</span>
        </Button>
      </div>
    </div >
  );
};
