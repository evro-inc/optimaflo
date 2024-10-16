'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '@/redux/formSlice';
import { SubmitHandler } from 'react-hook-form';
import { BuiltInVariableFormType, FormSchema } from '@/src/lib/schemas/gtm/builtInVariables';
import { Button } from '@/src/components/ui/button';
import { Form } from '@/src/components/ui/form';
import { BuiltInVariable, BuiltInVariableType, FormCreateGTMProps } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { gtmFormFieldConfigs } from '@/src/utils/gtmFormFields';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';
import AccountContainerWorkspaceRow from '../components';

const FormCreateBuiltInVariable: React.FC<FormCreateGTMProps> = React.memo(
  ({ tierLimits, accounts = [], containers = [], workspaces = [] }) => {
    const dispatch = useDispatch();
    const loading = useSelector((state: RootState) => state.form.loading);
    const error = useSelector((state: RootState) => state.form.error);
    const currentStep = useSelector((state: RootState) => state.form.currentStep);
    const notFoundError = useSelector(selectTable).notFoundError;
    const router = useRouter();
    const errorModal = useErrorHandling(error, notFoundError);

    useEffect(() => {
      // Ensure that we reset to the first step when the component mounts
      dispatch(setCurrentStep(1));
    }, [dispatch]);

    const remainingCreateData = calculateRemainingLimit(
      tierLimits || [],
      'GTMBuiltInVariables',
      'create'
    );
    const remainingCreate = remainingCreateData.remaining;

    const gtmAccountContainerWorkspacesPairs = workspaces.reduce(
      (acc, item) => {
        const account = accounts.find((acc) => acc.accountId === item.accountId);
        const container = containers.find((cont) => cont.containerId === item.containerId);
        const workspace = workspaces.find((ws) => ws.workspaceId === item.workspaceId);

        const identifier = `${account.accountId}-${container.containerId}-${workspace.workspaceId}`;

        if (!acc.seen.has(identifier)) {
          acc.seen.add(identifier);
          acc.result.push({
            accountId: account.accountId,
            accountName: account.name,
            containerId: container.containerId,
            containerName: container.name,
            workspaceId: workspace.workspaceId,
            workspaceName: workspace.name,
          });
        }

        return acc;
      },
      { seen: new Set(), result: [] }
    ).result;

    const configs = gtmFormFieldConfigs('GTMBuiltInVariables', 'create', remainingCreate, {
      gtmAccountContainerWorkspacesPairs,
    });

    console.log('configs', configs);

    const formDataDefaults: BuiltInVariable[] = [
      {
        path: '',
        type: '' as BuiltInVariableType,
        name: '',
        accountContainerWorkspace: [
          {
            accountId: '',
            containerId: '',
            workspaceId: '',
          },
        ],
      },
    ];

    const { formAmount, form, fields, addForm, count } = useFormInitialization<BuiltInVariable>(
      formDataDefaults,
      FormSchema
    );

    // Use the custom hook
    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['type', 'accountId', 'containerId', 'workspaceId'],
    });

    const onSubmit: SubmitHandler<BuiltInVariableFormType> = processForm(
      createBuiltInVariables,
      form.getValues(),
      () => form.reset({ forms: [formDataDefaults] }),
      dispatch,
      router,
      '/dashboard/gtm/configurations'
    );

    if (errorModal) return errorModal;

    const renderStepOne = () => (
      <Form {...formAmount}>
        <form className="w-2/3 space-y-6">
          <FormFieldComponent
            name="amount"
            {...configs.amount}
            onChange={(value) => {
              handleAmountChange(value.toString(), form, addForm, dispatch);
            }}
          />
          <Button type="button" onClick={handleNext}>
            Next
          </Button>
        </form>
      </Form>
    );

    const renderStepForms = () => {
      return (
        <div className="w-full">
          {fields.map((field, formIndex) => (
            <div key={field.id} className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
              <div className="max-w-xl mx-auto">
                <h1>Container {formIndex + 1}</h1>
                <div className="mt-12">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      id={`createContainer-${formIndex}`}
                      className="space-y-6"
                    >
                      {/* Render other form fields */}
                      {Object.entries(configs)
                        .filter(
                          ([key]) =>
                            key !== 'amount' &&
                            key !== 'accountId' &&
                            key !== 'containerId' &&
                            key !== 'workspaceId'
                        )
                        .map(([key, config]) => {
                          return (
                            <FormFieldComponent
                              key={key}
                              name={`forms.${formIndex}.${key}`}
                              label={config.label}
                              description={config.description}
                              placeholder={config.placeholder}
                              type={config.type}
                              options={config.options}
                            />
                          );
                        })}
                      {/* Using AccountContainerWorkspaceRow with formIndex */}
                      <AccountContainerWorkspaceRow
                        accounts={accounts}
                        containers={containers}
                        workspaces={workspaces}
                        formIndex={formIndex}
                      />
                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious}>
                          Previous
                        </Button>
                        {formIndex < count - 1 ? (
                          <Button type="button" onClick={handleNext}>
                            Next
                          </Button>
                        ) : (
                          <Button type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    };

    /*   */

    /*  const handleEntitySelection = (entity, checked, index) => {
     const newSelectedEntities = new Set(selectedEntities);
     if (checked) {
       newSelectedEntities.add(JSON.stringify({ ...entity, formIndex: index }));
     } else {
       newSelectedEntities.delete(JSON.stringify({ ...entity, formIndex: index }));
     }
     setSelectedEntities(newSelectedEntities);
   };
 
   const isVariableDisabled = (variable, entity, currentFormIndex) => {
     const currentFormEntities = includeDefaultValue[currentFormIndex]?.entity || [];
     return createdVariables.some(
       (createdVar) =>
         createdVar.accountId === entity.account &&
         createdVar.containerId === entity.container &&
         createdVar.workspaceId === entity.workspace &&
         createdVar.type === variable &&
         currentFormEntities.includes(`${entity.account}-${entity.container}-${entity.workspace}`)
     );
   }; */

    return (
      <div className="flex items-center justify-center h-screen">
        {currentStep === 1 ? renderStepOne() : renderStepForms()}
      </div>
    );

    /*   return (
      <div className="flex items-center justify-center h-screen overflow-auto">
        {currentStep === 1 ? (
          <Form {...formCreateAmount}>
            <form className="w-full md:w-2/3 space-y-6">
              <FormField
                control={formCreateAmount.control}
                name="amount"
                render={() => (
                  <FormItem>
                    <FormLabel>How many key built-in variable forms do you want to create?</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        handleAmountChange(value); // Call the modified handler
                      }}
                      defaultValue={count.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the amount of key events you want to create." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: remainingCreate }, (_, i) => (
                          <SelectItem key={i} value={`${i + 1}`}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </form>
          </Form>
        ) : (
          fields.map(
            (field, index) =>
              currentStep === index + 2 && (
                <div key={field.id}>
                
                  <div className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1">
                    <div className="max-w-full mx-auto">
                      <h1>Built In Variable {index + 1}</h1>
                      <div className="mt-2 md:mt-12">
  
                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(processForm)}
                            id={`createVar-${index}`}
                            className="space-y-6"
                          >
                            {(() => {
                              return (
                                <>
                                  <div>
                                    <div>
                                      <div className="w-full mx-auto">
                                        <Tabs
                                          defaultValue={
                                            Object.keys(BuiltInVariableGroups).includes('click')
                                              ? 'click'
                                              : Object.keys(BuiltInVariableGroups)[0]
                                          }
                                        >
                                          <TabsList className="flex border-b">
                                            {Object.keys(BuiltInVariableGroups).map((groupName) => (
                                              <TabsTrigger
                                                key={groupName}
                                                value={groupName}
                                                className="flex-shrink-0 min-w-[100px]"
                                              >
                                                {groupName}
                                              </TabsTrigger>
                                            ))}
                                          </TabsList>
  
                                          {Object.entries(BuiltInVariableGroups).map(
                                            ([groupName, variables]) => (
                                              <TabsContent key={groupName} value={groupName}>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[150px]">
                                                  {Array.from({
                                                    length: Math.ceil(variables.length / 5),
                                                  }).map((_, colIndex) => (
                                                    <div key={colIndex}>
                                                      {variables
                                                        .slice(colIndex * 5, (colIndex + 1) * 5)
                                                        .map((variable, varIndex) => (
                                                          <FormField
                                                            key={varIndex}
                                                            control={form.control}
                                                            name={`forms.${index}.type`}
                                                            render={({ field, fieldState }) => {
                                                              const isDisabled =
                                                                selectedEntities.size > 0 &&
                                                                Array.from(selectedEntities).some(
                                                                  (entityStr) => {
                                                                    const entity =
                                                                      JSON.parse(entityStr);
                                                                    return isVariableDisabled(
                                                                      variable,
                                                                      entity,
                                                                      index
                                                                    );
                                                                  }
                                                                );
  
                                                              return (
                                                                <FormItem className="flex items-start space-x-3 space-y-0 mb-2">
                                                                  <FormControl>
                                                                    <Checkbox
                                                                      checked={
                                                                        (Array.isArray(field.value) &&
                                                                          field.value.includes(
                                                                            variable
                                                                          )) ||
                                                                        Array.from(
                                                                          selectedEntities
                                                                        ).some((entityStr) => {
                                                                          const entity =
                                                                            JSON.parse(entityStr);
                                                                          return isVariableDisabled(
                                                                            variable,
                                                                            entity,
                                                                            index
                                                                          );
                                                                        })
                                                                      }
                                                                      onCheckedChange={(checked) => {
                                                                        if (
                                                                          !Array.from(
                                                                            selectedEntities
                                                                          ).some((entityStr) => {
                                                                            const entity =
                                                                              JSON.parse(entityStr);
                                                                            return isVariableDisabled(
                                                                              variable,
                                                                              entity,
                                                                              index
                                                                            );
                                                                          })
                                                                        ) {
                                                                          return checked
                                                                            ? field.onChange([
                                                                              ...(Array.isArray(
                                                                                field.value
                                                                              )
                                                                                ? field.value
                                                                                : []),
                                                                              variable,
                                                                            ])
                                                                            : field.onChange(
                                                                              (Array.isArray(
                                                                                field.value
                                                                              )
                                                                                ? field.value
                                                                                : []
                                                                              ).filter(
                                                                                (value) =>
                                                                                  value !== variable
                                                                              )
                                                                            );
                                                                        }
                                                                      }}
                                                                      disabled={isDisabled}
                                                                    />
                                                                  </FormControl>
                                                                  <FormLabel className="text-sm font-normal">
                                                                    {variable}
                                                                  </FormLabel>
                                                                  {fieldState.error && (
                                                                    <FormMessage>
                                                                      {fieldState.error.message}
                                                                    </FormMessage>
                                                                  )}
                                                                </FormItem>
                                                              );
                                                            }}
                                                          />
                                                        ))}
                                                    </div>
                                                  ))}
                                                </div>
                                              </TabsContent>
                                            )
                                          )}
                                        </Tabs>
                                      </div>
                                      <Button type="button" onClick={handleSelectAll}>
                                        {selectAll
                                          ? 'Unselect All Built-In Variables'
                                          : 'Select All Built-In Variables'}
                                      </Button>
                                    </div>
                                  </div>
  
                                  <div className="flex flex-col md:flex-row md:space-x-4 py-10">
                                    <div className="w-full md:basis-auto">
                                      <FormField
                                        control={form.control}
                                        name={`forms.${index}.entity`}
                                        render={() => (
                                          <FormItem>
                                            <div className="mb-4">
                                              <FormLabel className="text-base">
                                                Entity Selection
                                              </FormLabel>
                                              <FormDescription>
                                                Which account, container, and workspace do you want to
                                                create the built-in variable(s) for?
                                              </FormDescription>
                                            </div>
                                            {gtmAccountContainerWorkspacesPairs.map((item) => (
                                              <FormField
                                                key={`${item.account}-${item.container}-${item.workspace}`}
                                                control={form.control}
                                                name={`forms.${index}.entity`}
                                                render={({ field }) => {
                                                  const compositeValue = `${item.account}-${item.container}-${item.workspace}`;
                                                  const entity = {
                                                    account: item.account,
                                                    container: item.container,
                                                    workspace: item.workspace,
                                                  };
                                                  return (
                                                    <FormItem
                                                      key={compositeValue}
                                                      className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                      <FormControl>
                                                        <Checkbox
                                                          checked={
                                                            Array.isArray(field.value) &&
                                                            field.value.includes(compositeValue)
                                                          }
                                                          onCheckedChange={(checked) => {
                                                            handleEntitySelection(
                                                              entity,
                                                              checked,
                                                              index
                                                            );
                                                            return checked
                                                              ? field.onChange([
                                                                ...(Array.isArray(field.value)
                                                                  ? field.value
                                                                  : []),
                                                                compositeValue,
                                                              ])
                                                              : field.onChange(
                                                                (Array.isArray(field.value)
                                                                  ? field.value
                                                                  : []
                                                                ).filter(
                                                                  (value) =>
                                                                    value !== compositeValue
                                                                )
                                                              );
                                                          }}
                                                        />
                                                      </FormControl>
                                                      <FormLabel className="text-sm font-normal">
                                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                          <div>
                                                            <span className="text-gray-600 font-semibold">
                                                              Account:
                                                            </span>
                                                            <span className="ml-2 text-gray-800 font-medium">
                                                              {item.accountName}
                                                            </span>
                                                          </div>
                                                          <Separator orientation="vertical" />
                                                          <div>
                                                            <span className="text-gray-600 font-semibold">
                                                              Container:
                                                            </span>
                                                            <span className="ml-2 text-gray-800 font-medium">
                                                              {item.containerName}
                                                            </span>
                                                          </div>
                                                          <Separator orientation="vertical" />
                                                          <div>
                                                            <span className="text-gray-600 font-semibold">
                                                              Workspace:
                                                            </span>
                                                            <span className="ml-2 text-gray-800 font-medium">
                                                              {item.workspaceName}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </FormLabel>
                                                    </FormItem>
                                                  );
                                                }}
                                              />
                                            ))}
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                            <div className="flex justify-between">
                              <Button type="button" onClick={handlePrevious}>
                                Previous
                              </Button>
  
                              {currentStep - 1 < count ? (
                                <Button type="button" onClick={handleNext}>
                                  Next
                                </Button>
                              ) : (
                                <Button type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
                              )}
                            </div>
                          </form>
                        </Form>
  
                      </div>
                    </div>
                  </div>
                </div>
              )
          )
        )}
      </div>
    ); */
  }
);

FormCreateBuiltInVariable.displayName = 'FormCreateBuiltInVariable';

export default FormCreateBuiltInVariable;
