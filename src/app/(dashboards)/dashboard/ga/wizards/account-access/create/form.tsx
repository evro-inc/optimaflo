'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler } from 'react-hook-form';
import { AccountPermissionsSchema, FormsSchema } from '@/src/lib/schemas/ga/accountAccess';
import { Button } from '@/src/components/ui/button';
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
import { Input } from '@/src/components/ui/input';
import { AccessBinding, FormCreateProps, Role } from '@/src/types/types';
import { selectTable } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import { createGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/accountPermissions';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { DataRestrictions, Roles } from '../../../access-permissions/@accounts/items';
import { Separator } from '@/src/components/ui/separator';
import { Checkbox } from '@/src/components/ui/checkbox';
import { useErrorHandling, useFormInitialization, useStepNavigation } from '@/src/hooks/wizard';
import { calculateRemainingLimit, handleAmountChange, processForm } from '@/src/utils/utils';
import { formFieldConfigs } from '@/src/utils/gaFormFields';
import { FormFieldComponent } from '@/src/components/client/Utils/Form';

const FormCreateAccountAccess: React.FC<FormCreateProps> = React.memo(
  ({ tierLimits, accounts = [] }) => {
    const dispatch = useDispatch();
    const loading = useSelector((state: RootState) => state.form.loading);
    const error = useSelector((state: RootState) => state.form.error);
    const currentStep = useSelector((state: RootState) => state.form.currentStep);
    const count = useSelector((state: RootState) => state.form.count);
    const notFoundError = useSelector(selectTable).notFoundError;
    const router = useRouter();

    const errorModal = useErrorHandling(error, notFoundError);

    const remainingCreateData = calculateRemainingLimit(
      tierLimits || [],
      'GA4AccountAccess',
      'create'
    );
    const remainingCreate = remainingCreateData.remaining;

    const configs = formFieldConfigs('create', remainingCreate);

    const formDataDefaults: AccessBinding[] = [
      {
        name: '',
        roles: [Role.VIEWER],
        account: '',
        user: '',
        property: '',
      },
    ];

    const { formAmount, form, fields, addForm } = useFormInitialization<AccessBinding>(
      formDataDefaults,
      FormsSchema
    );

    // Use the custom hook
    const { handleNext, handlePrevious } = useStepNavigation({
      form,
      currentStep,
      fieldsToValidate: ['roles', 'user'],
    });

    const onSubmit: SubmitHandler<AccountPermissionsSchema> = processForm(
      createGAAccessBindings,
      formDataDefaults,
      () => form.reset({ forms: [formDataDefaults] }),
      dispatch,
      router,
      '/dashboard/ga/access-permissions'
    );

    if (errorModal) return errorModal;

    return (
      <div className="flex items-center justify-center h-screen overflow-auto">
        {/* Conditional rendering based on the currentStep */}
        {currentStep === 1 && (
          <Form {...formAmount}>
            <form className="w-2/3 space-y-6">
              {/* Amount selection logic */}
              <FormFieldComponent
                name="amount"
                {...configs.amount}
                onChange={(value) => {
                  handleAmountChange(value, form, addForm, dispatch);
                }}
              />
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </form>
          </Form>
        )}
        {currentStep > 1 && (
          <div className="w-full">
            {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
            {fields.length >= currentStep - 1 && (
              <div
                key={fields[currentStep - 2].id}
                className="max-w-full md:max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-1"
              >
                <div className="max-w-full md:max-w-xl mx-auto">
                  <h1>User {currentStep - 1}</h1>
                  <div className="mt-2 md:mt-12">
                    {/* Form */}

                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        id={`createConversion-${currentStep - 1}`}
                        className="space-y-6"
                      >
                        {(() => {
                          const currentIndex = currentStep - 2; // Adjust for zero-based index

                          return (
                            <>
                              <div className="flex flex-col md:flex-row md:space-x-4">
                                <div className="w-full md:basis-auto">
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentIndex}.account`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Account</FormLabel>
                                        <FormDescription>
                                          This is the account you want to add a user to.
                                        </FormDescription>
                                        <FormControl>
                                          <Select
                                            {...form.register(`forms.${currentIndex}.account`)}
                                            {...field}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select an account." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectGroup>
                                                <SelectLabel>Account</SelectLabel>
                                                {accounts.map((account) => (
                                                  <SelectItem
                                                    key={account.name}
                                                    value={account.name}
                                                  >
                                                    {account.displayName}
                                                  </SelectItem>
                                                ))}
                                              </SelectGroup>
                                            </SelectContent>
                                          </Select>
                                        </FormControl>

                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col md:flex-row md:space-x-4">
                                <div className="w-full md:basis-auto">
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentIndex}.user`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>User Email</FormLabel>
                                        <FormDescription>
                                          This is the email of the user you want to add to the
                                          account.
                                        </FormDescription>
                                        <FormControl>
                                          <Input
                                            placeholder="User email"
                                            {...form.register(`forms.${currentIndex}.user`)}
                                            {...field}
                                          />
                                        </FormControl>

                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col md:flex-row md:space-x-4">
                                <div className="w-full md:basis-auto">
                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentIndex}.roles`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-3">
                                        <FormLabel>Standard roles</FormLabel>
                                        <FormControl>
                                          <RadioGroup
                                            {...form.register(`forms.${currentIndex}.roles`)}
                                            onValueChange={field.onChange}
                                          >
                                            {Roles.map((item) => (
                                              <FormItem
                                                key={item.label}
                                                className="flex items-center space-x-3 space-y-0"
                                              >
                                                <FormControl>
                                                  <RadioGroupItem value={item.id} />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                  {item.label}
                                                </FormLabel>
                                              </FormItem>
                                            ))}
                                          </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="pt-5 pb-5">
                                    <Separator />
                                  </div>

                                  <FormField
                                    control={form.control}
                                    name={`forms.${currentIndex}.roles`}
                                    render={() => (
                                      <FormItem>
                                        <div className="mb-4">
                                          <FormLabel className="text-base">
                                            Data restrictions (GA4 properties only)
                                          </FormLabel>
                                          <FormDescription>
                                            Select the data restrictions for the user.
                                          </FormDescription>
                                        </div>
                                        {DataRestrictions.map((item) => (
                                          <FormField
                                            key={item.id}
                                            control={form.control}
                                            name={`forms.${currentIndex}.roles`}
                                            render={({ field }) => {
                                              return (
                                                <FormItem
                                                  key={item.id}
                                                  className="flex flex-row items-start space-x-3 space-y-0"
                                                >
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={field.value?.includes(
                                                        item.id as Role
                                                      )}
                                                      onCheckedChange={(checked) => {
                                                        return checked
                                                          ? field.onChange([
                                                              ...(field.value ?? []),
                                                              item.id as Role,
                                                            ])
                                                          : field.onChange(
                                                              (field.value ?? []).filter(
                                                                (value) => value !== item.id
                                                              )
                                                            );
                                                      }}
                                                    />
                                                  </FormControl>
                                                  <FormLabel className="text-sm font-normal">
                                                    {item.label}
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

                    {/* End Form */}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);
FormCreateAccountAccess.displayName = 'FormCreateAccountAccess';

export default FormCreateAccountAccess;
