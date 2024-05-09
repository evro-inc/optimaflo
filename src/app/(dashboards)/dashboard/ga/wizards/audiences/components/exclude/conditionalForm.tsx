import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/src/components/ui/card';
import { PlusIcon, TrashIcon, CircleIcon, PersonIcon } from '@radix-ui/react-icons';
import { FormControl, FormField, FormItem, FormMessage } from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import {
  SequenceScope,
  SimpleScope,
  TimeConstraint,
} from '../../../../properties/@audiences/items';
import SequenceStepComponent from './sequenceStepForm';
import { AudienceClauseType, AudienceFilterScope } from '@/src/types/types';
import CardForm from './simpleForm';

export default function IncludeConditionalForm({
  combinedCategories,
  audienceFormIndex,
  control,
  register,
  watch,
  setValue,
}) {
  const {
    fields: SimpleForm,
    append: SimpleAppend,
    remove: SimpleRemove,
  } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses.simpleFilter`,
  });

  const {
    fields: SequenceForm,
    append: SequenceAppend,
    remove: SequenceRemove,
  } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses.sequenceFilter`,
  });

  return (
    <>
      {/* //////////////////////////////////////////////////////////////////////////
    //// This is the main component for the simple form in the audience wizard.
    //////////////////////////////////////////////////////////////////////////*/}
      <ul>
        {SimpleForm.map((simpleItem, simpleIndex) => {
          return (
            <li key={simpleItem.id} className="pb-5">
              {simpleIndex > 0 && (
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
                        name={`forms.[${audienceFormIndex}].filterClauses[${simpleIndex}].simpleFilter.scope`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select
                                {...register(
                                  `forms.[${audienceFormIndex}].filterClauses[${simpleIndex}].simpleFilter.scope`
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
                      <Button variant="ghost" size="icon" onClick={() => SimpleRemove(simpleIndex)}>
                        <TrashIcon className="text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <CardForm
                    audienceFormIndex={audienceFormIndex}
                    combinedCategories={combinedCategories}
                    simpleFormIndex={simpleIndex}
                    {...{ control, register, watch, setValue }}
                  />
                </CardContent>
              </Card>
            </li>
          );
        })}

        {/* //////////////////////////////////////////////////////////////////////////
    //// This is the main component for the sequence form in the audience wizard.
    //////////////////////////////////////////////////////////////////////////*/}

        {SequenceForm.map((sequenceItem, sequenceIndex) => {
          console.log(SimpleForm.length);

          return (
            <li key={sequenceItem.id} className="pb-5">
              {SimpleForm.length > 0 ? (
                <div className="w-10 flex flex-col items-center justify-center space-y-2">
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                  <Badge variant="secondary">AND</Badge>
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                </div>
              ) : sequenceIndex > 0 ? (
                <div className="w-10 flex flex-col items-center justify-center space-y-2">
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                  <Badge variant="secondary">AND</Badge>
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                </div>
              ) : null}
              <Card>
                <CardHeader>
                  <div className="flex items-center w-full">
                    <div className="flex basis-5/12">
                      <CircleIcon className="text-blue-500 mr-2" />
                      <span className="flex text-sm font-medium">Include sequence:</span>
                    </div>

                    <div className="flex flex-grow basis-7/12 justify-end">
                      <div className="flex items-center space-x-2">
                        <PersonIcon className="text-gray-600" />


                        <FormField
                          control={control}
                          name={`forms.[${audienceFormIndex}].filterClauses[${sequenceIndex}].sequenceFilter.scope`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select
                                  {...register(
                                    `forms.[${audienceFormIndex}].filterClauses[${sequenceIndex}].sequenceFilter.scope`
                                  )}
                                  {...field}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger id="user-action">
                                    <SelectValue placeholder="Sequence scoping" />
                                  </SelectTrigger>
                                  <SelectContent position="popper">
                                    {SequenceScope.map((item) => (
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
                        {TimeConstraint()}
                        <Separator orientation="vertical" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => SequenceRemove(sequenceIndex)}
                        >
                          <TrashIcon className="text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center space-y-2 w-full pt-2">
                    <Separator />
                  </div>
                </CardHeader>

                <SequenceStepComponent
                  combinedCategories={combinedCategories}
                  audienceFormIndex={audienceFormIndex}
                  sequenceFormIndex={sequenceIndex}
                  removeSequence={SequenceRemove}
                  {...{ control, register, watch }}
                />
              </Card>
            </li>
          );
        })}
      </ul>

      <section className="flex space-x-4">
        <Button
          type="button"
          className="flex items-center space-x-2"
          variant="secondary"
          onClick={() => {
            SimpleAppend({
              clauseType: AudienceClauseType.Include,
              simpleFilter: {
                scope: AudienceFilterScope.WithinSameEvent,
                filterExpression: {
                  andGroup: {
                    filterExpressions: [],
                  },
                },
              },
            });
          }}
        >
          <PlusIcon className="text-white" />
          <span>Add condition group to exclude</span>
        </Button>

        <Button
          type="button"
          className="flex items-center space-x-2"
          variant="secondary"
          onClick={() => {
            SequenceAppend({
              clauseType: AudienceClauseType.Include,
              sequenceFilter: {
                scope: AudienceFilterScope.AcrossAllSessions,
                sequenceSteps: [],
              },
            });
          }}
        >
          <PlusIcon className="text-white" />
          <span>Add sequence to exclude</span>
        </Button>
      </section>
    </>
  );
}
