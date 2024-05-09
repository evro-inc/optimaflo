import React from 'react';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import {
  sequenceStepFilterExpression,
} from '../../../../properties/@audiences/items';
import OrForm from './sequenceOrForm';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';
import { AudienceFilterScope } from '@/src/types/types';

export default ({
  combinedCategories,
  audienceFormIndex,
  sequenceFormIndex,
  sequenceStepIndex,
  control,
  register,
  watch,
}) => {

  const base = `forms[${audienceFormIndex}].filterClauses[${sequenceFormIndex}].sequenceFilter.sequenceSteps[${sequenceStepIndex}].filterExpression.andGroup.filterExpressions`
  const { fields, remove, append } = useFieldArray({
    control,
    name: base,
  });

  return (
    <div>
      {fields.map((item, andGroupFilterExpressionIndex) => {

        return (
          <div key={item.id}>
            {andGroupFilterExpressionIndex > 0 && (
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

                      <OrForm
                        combinedCategories={combinedCategories}
                        audienceFormIndex={audienceFormIndex}
                        sequenceFormIndex={sequenceFormIndex}
                        sequenceStepIndex={sequenceStepIndex}
                        andGroupFilterExpressionIndex={andGroupFilterExpressionIndex}
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
              scope: AudienceFilterScope.AcrossAllSessions, // Default scope
              immediatelyFollows: false, // Default value for immediatelyFollows
              filterExpression: sequenceStepFilterExpression, // Default filterExpression structure
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
