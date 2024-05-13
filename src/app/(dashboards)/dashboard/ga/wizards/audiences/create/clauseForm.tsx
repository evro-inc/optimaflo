import React from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import ConditionalForm from '../components/conditionalForm';
import { AudienceClauseType, AudienceFilterScope } from '@/src/types/types';
import { Button } from '@/src/components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';

// Component to handle the rendering of each clause
function FilterClause({
  clause,
  audienceFormIndex,
  index,
  combinedCategories,
  setSelectedFilterType,
}) {
  if (clause.clauseType === 'INCLUDE') {
    return (
      <div className="py-3">
        <ConditionalForm
          combinedCategories={combinedCategories}
          audienceFormIndex={audienceFormIndex}
          setSelectedFilterType={setSelectedFilterType}
          filterClauseIindex={index}
          clauseTypeValue={AudienceClauseType.Include}
        />
      </div>
    );
  } else if (clause.clauseType === 'EXCLUDE') {
    return (
      <div className="py-3">
        <ConditionalForm
          combinedCategories={combinedCategories}
          audienceFormIndex={audienceFormIndex}
          setSelectedFilterType={setSelectedFilterType}
          filterClauseIindex={index}
          clauseTypeValue={AudienceClauseType.Exclude}
        />
      </div>
    );
  }

  return null; // Default return if not include or exclude
}

export default ({ combinedCategories, audienceFormIndex, setSelectedFilterType }) => {
  // Assuming your form setup is already using `useForm`
  const { control } = useFormContext();

  const { fields, append } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses`,
  });

  const { append: SimpleAppend, remove: SimpleRemove } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses.simpleFilter`,
  });

  const { append: SequenceAppend, remove: SequenceRemove } = useFieldArray({
    control,
    name: `forms[${audienceFormIndex}].filterClauses.sequenceFilter`,
  });

  // Function to add a new include clause

  const addSimpleClauseInclude = () => {
    append({
      clauseType: AudienceClauseType.Include,
      simpleFilter: {
        scope: '',
        filterExpression: {},
      },
    });
    setSelectedFilterType('simple');
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
  };

  const addSequenceClauseInclude = () => {
    append({
      clauseType: AudienceClauseType.Include,
      sequenceFilter: {
        scope: AudienceFilterScope.AcrossAllSessions,
        sequenceSteps: [],
      },
    });
    setSelectedFilterType('sequence');
    SequenceAppend({
      clauseType: AudienceClauseType.Include,
      sequenceFilter: {
        scope: AudienceFilterScope.AcrossAllSessions,
        sequenceSteps: [],
      },
    });
  };

  // Function to add a new exclude clause
  const addSimpleClauseExclude = () => {
    append({
      clauseType: AudienceClauseType.Exclude,
      simpleFilter: {
        scope: '',
        filterExpression: {},
      },
    });
    setSelectedFilterType('simple');
    SimpleAppend({
      clauseType: AudienceClauseType.Exclude,
      simpleFilter: {
        scope: AudienceFilterScope.WithinSameEvent,
        filterExpression: {
          andGroup: {
            filterExpressions: [],
          },
        },
      },
    });
  };

  const addSequenceClauseExclude = () => {
    append({
      clauseType: AudienceClauseType.Exclude,
      sequenceFilter: {
        scope: AudienceFilterScope.AcrossAllSessions,
        sequenceSteps: [],
      },
    });
    setSelectedFilterType('sequence');
    SequenceAppend({
      clauseType: AudienceClauseType.Exclude,
      sequenceFilter: {
        scope: AudienceFilterScope.AcrossAllSessions,
        sequenceSteps: [],
      },
    });
  };

  return (
    <div>
      {fields.map((field, index) => (
        <FilterClause
          key={field.id}
          clause={field}
          audienceFormIndex={audienceFormIndex}
          index={index}
          combinedCategories={combinedCategories}
          setSelectedFilterType={setSelectedFilterType}
        />
      ))}

      <section>
        <div className="flex space-x-4">
          {/* Include */}
          <Button
            type="button"
            className="flex items-center space-x-2"
            variant="secondary"
            onClick={addSimpleClauseInclude}
          >
            <PlusIcon className="text-white" />
            <span>Add condition group to include</span>
          </Button>

          <Button
            type="button"
            className="flex items-center space-x-2"
            variant="secondary"
            onClick={addSequenceClauseInclude}
          >
            <PlusIcon className="text-white" />
            <span>Add sequence to include</span>
          </Button>
        </div>

        <div className="flex space-x-4 pt-5">
          {/* Exclude */}
          <Button
            type="button"
            className="flex items-center space-x-2"
            variant="secondary"
            onClick={addSimpleClauseExclude}
          >
            <PlusIcon className="text-white" />
            <span>Add condition group to exclude</span>
          </Button>

          <Button
            type="button"
            className="flex items-center space-x-2"
            variant="secondary"
            onClick={addSequenceClauseExclude}
          >
            <PlusIcon className="text-white" />
            <span>Add sequence to exclude</span>
          </Button>
        </div>
      </section>
    </div>
  );
};
