'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/properties';
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
import { FeatureResponse, FormCreateProps, GA4PropertyType } from '@/src/types/types';
import { toast } from 'sonner';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import {
  CurrencyCodes,
  IndustryCategories,
  TimeZones,
} from '../../../properties/@properties/propertyItems';
import { handleAmountChange, processForm } from '@/src/utils/utils';
import { useFormInitialization } from '@/src/hooks/wizard';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const ErrorModal = dynamic(
  () =>
    import('../../../../../../../components/client/modals/Error').then((mod) => mod.ErrorMessage),
  { ssr: false }
);

type Forms = z.infer<typeof FormsSchema>;

const FormCreateProperty: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4Properties'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter((property) => property.parent === account.name);

      return {
        ...account,
        properties: accountProperties,
      };
    })
    .filter((account) => account.properties.length > 0);

  const formDataDefaults: GA4PropertyType = {
    name: table[0].displayName,
    parent: accountsWithProperties[0].name,
    currencyCode: 'USD',
    displayName: '',
    industryCategory: 'AUTOMOTIVE',
    timeZone: 'America/New_York',
    propertyType: 'PROPERTY_TYPE_ORDINARY',
    retention: 'FOURTEEN_MONTHS',
    resetOnNewActivity: true,
    acknowledgment: true,
  };

  const { formCreateAmount, form, fields, addForm, propertyCount } = useFormInitialization(formDataDefaults);

  if (notFoundError) return <NotFoundErrorModal onClose={undefined} />;
  if (error) return <ErrorModal />;


  const onSubmit: SubmitHandler<Forms> = processForm<GA4PropertyType>(
    createProperties,
    formDataDefaults,
    () => form.reset({ forms: [formDataDefaults] }),
    dispatch,
    router
  );

  const handleNext = async () => {
    const currentFormIndex = currentStep - 2; // Adjusting for the array index and step count
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.displayName`,
      `${currentFormPath}.parent`,
      `${currentFormPath}.currencyCode`,
      `${currentFormPath}.timeZone`,
      `${currentFormPath}.industryCategory`,
    ];

    // Now, trigger validation for these fields
    const isFormValid = await form.trigger(fieldsToValidate as any);

    if (isFormValid) {
      dispatch(incrementStep());
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  return (
    <div className="flex items-center justify-center h-screen">
      {/* Conditional rendering based on the currentStep */}
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form className="w-2/3 space-y-6">
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many users do you want to add?</FormLabel>
                  <Select
                    {...field} // This binds the Select to the form state
                    onValueChange={(value) => {
                      field.onChange(value); // Update form state
                      handleAmountChange(value, form, addForm, dispatch);
                    }}
                    defaultValue={propertyCount.toString()} // Convert count to string
                    value={field.value.toString()} // Convert value to string
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of conversion events you want to create." />
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
      )}

      {currentStep > 1 && (
        <div className="w-full">
          {/* Render only the form corresponding to the current step - 1 
              (since step 1 is for selecting the number of forms) */}
          {fields.length >= currentStep - 1 && (
            <div
              key={fields[currentStep - 2].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>Property {currentStep - 1}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      id="createProperty"
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.displayName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Property Name</FormLabel>
                            <FormDescription>
                              This is the property name you want to create.
                            </FormDescription>
                            <FormControl>
                              <Input
                                placeholder="Name of the property"
                                {...form.register(`forms.${currentStep - 2}.displayName`)}
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.parent`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account</FormLabel>
                            <FormDescription>
                              This is the account you want to create the property in.
                            </FormDescription>
                            <FormControl>
                              <Select
                                {...form.register(`forms.${currentStep - 2}.parent`)}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select an account." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Account</SelectLabel>
                                    {accountsWithProperties.map((account) => (
                                      <SelectItem key={account.name} value={account.name}>
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

                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.currencyCode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <FormDescription>
                              Which currency do you want to include in the property?
                            </FormDescription>
                            <FormControl>
                              <Select
                                {...form.register(`forms.${currentStep - 2}.currencyCode`)}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select a currency." />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Currency</SelectLabel>
                                    {CurrencyCodes.map((code) => (
                                      <SelectItem key={code} value={code}>
                                        {code}
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

                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.timeZone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Zone</FormLabel>
                            <FormDescription>
                              Which timeZone do you want to include in the property?
                            </FormDescription>
                            <FormControl>
                              <Select
                                {...form.register(`forms.${currentStep - 2}.timeZone`)}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select a timeZone." />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Timezone</SelectLabel>
                                    {TimeZones.map((timeZone) => (
                                      <SelectItem key={timeZone} value={timeZone}>
                                        {timeZone}
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
                      <FormField
                        control={form.control}
                        name={`forms.${currentStep - 2}.industryCategory`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormDescription>
                              Which category do you want to include in the property?
                            </FormDescription>
                            <FormControl>
                              <Select
                                {...form.register(`forms.${currentStep - 2}.industryCategory`)}
                                {...field}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select a category." />
                                </SelectTrigger>

                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Timezone</SelectLabel>
                                    {Object.entries(IndustryCategories).map(([label, value]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
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
                      <div className="flex justify-between">
                        <Button type="button" onClick={handlePrevious}>
                          Previous
                        </Button>

                        {currentStep - 1 < propertyCount ? (
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
};

export default FormCreateProperty;
