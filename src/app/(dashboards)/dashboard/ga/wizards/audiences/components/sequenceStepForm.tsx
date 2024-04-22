import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardFooter, CardHeader } from '@/src/components/ui/card';
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
import { Cross2Icon, PersonIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import {
  ImmediatelyFollows,
  renderFilterInput,
  sequenceStepFilterExpression,
  SimpleScope,
  TimeConstraint,
} from '../../../properties/@audiences/items';
import Sequence from './sequenceForm';

import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { AudienceFilterScope } from '@/src/types/types';

export default ({
  combinedCategories,
  audienceFormIndex,
  sequenceFormIndex,
  removeSequence,
  control,
  register,
  watch,
}) => {
  const { fields, remove, append } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses.sequenceFilter[${sequenceFormIndex}].sequenceSteps`,
  });

  console.log('fields', fields);
  console.log(sequenceFormIndex);




  return (
    <>
      {fields.map((step, stepIndex) => {
        return (
          <>

            <CardContent key={step.id}>
              {stepIndex >= 1 ? (
                // Custom rendering for the first step
                <div className="flex items-center w-full">
                  <div className="flex flex-grow basis-full justify-start bg-gray-300 rounded p-2">
                    <div className="flex items-center space-x-2">
                      <Select>
                        <SelectTrigger
                          id="user-action"
                          className="border-none outline-none focus:outline-none focus:ring-0 shadow-none"
                        >
                          <SelectValue
                            placeholder="followed by"
                            className="border-none outline-none focus:outline-none focus:ring-0"
                          />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="border-none outline-none focus:outline-none focus:ring-0"
                        >
                          {ImmediatelyFollows.map((item) => (
                            <SelectItem key={item.label} value={item.id}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Separator orientation="vertical" className="bg-gray-400" />
                      {TimeConstraint()}
                    </div>
                  </div>
                </div>
              ) :
                null}

              <div className="flex items-center w-full p-5">
                <div className="basis-3/12">
                  <p>Step {stepIndex + 1}</p>
                </div>
                <div className="flex flex-grow basis-9/12 justify-end">
                  <div className="flex items-center space-x-2">
                    <PersonIcon className="text-gray-600" />
                    <Select>
                      <SelectTrigger id="user-action">
                        <SelectValue placeholder="Step scoping" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {SimpleScope.map((item) => (
                          <SelectItem key={item.label} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Separator orientation="vertical" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(stepIndex)}
                      disabled={fields.length <= 1}
                    >
                      <TrashIcon className="text-gray-400" />
                    </Button>
                  </div>
                </div>
              </div>

              <Sequence
                audienceFormIndex={audienceFormIndex}
                combinedCategories={combinedCategories}
                sequenceFormIndex={sequenceFormIndex}
                sequenceStepIndex={stepIndex}
                removeSequence={removeSequence}
                removeStep={remove}
                {...{ control, register, watch }}
              />
            </CardContent>

          </>
        )
      }
      )
      }
      <CardFooter>
        <div className="flex flex-col items-center space-y-2 w-full">
          <Separator />
          <div className="w-full flex justify-start">
            <Button
              className="flex items-center space-x-2"
              onClick={() =>
                append({
                  scope: AudienceFilterScope.WITHIN_SAME_EVENT,
                  immediatelyFollows: false,
                  constraintDuration: '',
                  filterExpression: sequenceStepFilterExpression,
                })
              }
              variant="ghost"
            >
              <span>Add Step</span>
            </Button>
          </div>
        </div>
      </CardFooter>
    </>
  );
};
