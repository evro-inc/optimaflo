import React from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import ConditionalForm from '../components/conditionalForm';
import { AudienceClauseType, AudienceFilterScope, MatchType } from '@/src/types/types';
import { Button } from '@/src/components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';

// Component to handle the rendering of each clause
function FilterClause({
    clause,
    audienceFormIndex,
    index,
    combinedCategories,
}) {
    if (clause.clauseType === 'INCLUDE') {
        return (
            <div className="py-3">
                <ConditionalForm
                    combinedCategories={combinedCategories}
                    audienceFormIndex={audienceFormIndex}
                    filterClauseIndex={index}
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
                    filterClauseIndex={index}
                    clauseTypeValue={AudienceClauseType.Exclude}
                />
            </div>
        );
    }

    return null; // Default return if not include or exclude
}

export default ({ combinedCategories, audienceFormIndex }) => {
    // Assuming your form setup is already using `useForm`
    const { control } = useFormContext();

    const { fields, append } = useFieldArray({
        control,
        name: `forms[${audienceFormIndex}].filterClauses`,
    });

    const { append: SimpleAppend } = useFieldArray({
        control,
        name: `forms[${audienceFormIndex}].filterClauses.simpleFilter`,
    });

    const { append: SequenceAppend } = useFieldArray({
        control,
        name: `forms[${audienceFormIndex}].filterClauses.sequenceFilter`,
    });

    // Function to add a simple clause
    const addSimpleClause = (AudienceClause) => {
        append({
            clauseType: AudienceClause,
            simpleFilter: {
                scope: '',
                filterExpression: {
                    andGroup: {
                        filterExpressions: [],
                    },
                },
            },
        });
        SimpleAppend({
            clauseType: AudienceClause,
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

    // Function to add a sequence clause
    const addSequenceClause = (AudienceClause) => {
        append({
            clauseType: AudienceClause,
            sequenceFilter: {
                scope: AudienceFilterScope.AcrossAllSessions,
                sequenceSteps: [
                    {
                        andGroup: {
                            filterExpressions: [],
                        },
                    },
                ],
            },
        });
        SequenceAppend({
            clauseType: AudienceClause,
            sequenceFilter: {
                scope: AudienceFilterScope.AcrossAllSessions,
                sequenceSteps: [
                    {
                        andGroup: {
                            filterExpressions: [],
                        },
                    },
                ],
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
                />
            ))}

            <section>
                <div className="flex space-x-4">
                    {/* Include */}
                    <Button
                        type="button"
                        className="flex items-center space-x-2"
                        variant="secondary"
                        onClick={() => addSimpleClause(AudienceClauseType.Include)}
                    >
                        <PlusIcon className="text-white" />
                        <span>Add condition group to include</span>
                    </Button>

                    <Button
                        type="button"
                        className="flex items-center space-x-2"
                        variant="secondary"
                        onClick={() => addSequenceClause(AudienceClauseType.Include)}
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
                        onClick={() => addSimpleClause(AudienceClauseType.Exclude)}
                    >
                        <PlusIcon className="text-white" />
                        <span>Add condition group to exclude</span>
                    </Button>

                    <Button
                        type="button"
                        className="flex items-center space-x-2"
                        variant="secondary"
                        onClick={() => addSequenceClause(AudienceClauseType.Exclude)}
                    >
                        <PlusIcon className="text-white" />
                        <span>Add sequence to exclude</span>
                    </Button>
                </div>
            </section>
        </div>
    );
};
