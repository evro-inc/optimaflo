'use client';
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LimitReached } from '../../../../../../components/client/modals/limitReached';
import { ButtonGroup } from '../../../../../../components/client/ButtonGroup/ButtonGroup';
import { FeatureResponse, FormCreateProps } from '@/src/lib/types/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/lib/redux/tableSlice';
import { selectGlobal, setLoading } from '@/src/lib/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { CreatePropertySchema } from '@/src/lib/schemas/ga/properties';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Cross1Icon } from '@radix-ui/react-icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
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
import { CurrencyCodes, IndustryCategories, TimeZones } from './propertyItems';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

type Forms = z.infer<typeof CreatePropertySchema>;

const FormCreateProperty: React.FC<FormCreateProps> = ({
  showOptions,
  onClose,
  accounts = [],
  table = [],
}) => {
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const dispatch = useDispatch();
  const { loading } = useSelector(selectGlobal);
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;
  const data = table.getRowModel().rows.map((row) => row.original);

  const formData = {
    name: data[0].displayName,
    parent: data[0].parent,
    currencyCode: 'USD',
    displayName: '',
    industryCategory: 'AUTOMOTIVE',
    timeZone: 'America/New_York',
    propertyType: 'PROPERTY_TYPE_ORDINARY',
    retention: 'FOURTEEN_MONTHS',
    resetOnNewActivity: true,
  };

  const form = useForm<Forms>({
    defaultValues: {
      forms: [formData],
    },
    resolver: zodResolver(CreatePropertySchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const addForm = () => {
    append(formData);
  };

  const removeForm = () => {
    if (fields.length > 1) {
      remove(fields.length - 1);
    }
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating properties...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueProperties = new Set(forms.map((form) => form.parent));

    for (const form of forms) {
      const identifier = `${form.parent} - ${form.name} - ${form.displayName}`;
      if (uniqueProperties.has(identifier)) {
        toast.error(
          `Duplicate property found for ${form.name} - ${form.displayName}`,
          {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss(),
            },
          }
        );
        dispatch(setLoading(false));
        return;
      }
      uniqueProperties.add(identifier);
    }

    try {
      const res = (await createProperties({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Property ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create container ${result.name}. Please check your access permissions. Any other containers created were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });

          dispatch(setErrorDetails(res.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
          onClose();
        }

        if (res.limitReached) {
          res.results.forEach((result) => {
            if (result.limitReached) {
              toast.error(
                `Unable to create container ${result.name}. You have ${result.remaining} more container(s) you can create.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });
          dispatch(setIsLimitReached(true));
          onClose();
        }

        onClose(); // Close the form
        form.reset({
          forms: [formData],
        });
      }

      onClose();

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [formData],
      });
    } catch (error) {
      toast.error('An unexpected error occurred.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
      return { success: false };
    } finally {
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleClose = () => {
    // Reset the forms to their initial state
    form.reset({
      forms: [formData],
    });

    // Close the modal
    onClose();
  };

  const accountIdsWithProperties = new Set(
    data.map((property) => property.parent)
  );
  const transformedSet = new Set(
    Array.from(accountIdsWithProperties, (value) => `accounts/${value}`)
  );

  // match parent with account
  const accountsWithProperties = accounts.filter((account) =>
    transformedSet.has(account.name)
  );

  return (
    <>
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-start z-50 bg-white overflow-y-auto"
          >
            {/* Close Button */}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="absolute top-5 right-5 font-bold"
            >
              <Cross1Icon className="h-4 w-4" />{' '}
              <span className="sr-only">Close</span>
            </Button>

            <div className="flex items-center justify-between py-3 px-4 mt-5 gap-4">
              <ButtonGroup
                buttons={[
                  { text: 'Add Form', onClick: addForm },
                  { text: 'Remove Form', onClick: removeForm },
                  {
                    text: loading ? 'Submitting...' : 'Submit',
                    type: 'submit',
                    form: 'createProperty',
                  },
                ]}
              />
            </div>

            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => {
                const selectedPropertyId = form.watch(`forms.${index}.parent`);

                // Filter propertys to only include those that belong to the selected account
                const filteredProperties = data.filter(
                  (property) => property.parent === selectedPropertyId
                );

                // Create a Set to store unique container IDs
                const uniquePropertyIds = new Set(
                  filteredProperties.map((property) => property.parent)
                );

                // Filter the properties again to only include unique properties
                const uniqueFilteredProperties = filteredProperties.filter(
                  (property, idx, self) =>
                    idx ===
                    self.findIndex(
                      (p) =>
                        p.parent === property.parent &&
                        uniquePropertyIds.has(p.parent)
                    )
                );

                return (
                  <div
                    key={field.id}
                    className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                  >
                    <div className="max-w-xl mx-auto">
                      <div className="mt-12">
                        {/* Form */}

                        <Card className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
                          <CardHeader className="bg-gray-100 p-4">
                            <CardTitle className="text-lg font-semibold">
                              Property {index + 1}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <Form {...form}>
                              <form
                                ref={(el) => (formRefs.current[index] = el)}
                                onSubmit={form.handleSubmit(processForm)}
                                id="createProperty"
                                className="space-y-6"
                              >
                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Property Name</FormLabel>
                                      <FormDescription>
                                        This is the property name you want to
                                        create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the property"
                                          {...form.register(
                                            `forms.${index}.displayName`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.parent`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Account</FormLabel>
                                      <FormDescription>
                                        This is the account you want to create
                                        the property in.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${index}.parent`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select an account." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Account</SelectLabel>
                                              {accountsWithProperties.map(
                                                (account) => (
                                                  <SelectItem
                                                    key={account.name}
                                                    value={account.name}
                                                  >
                                                    {account.displayName}
                                                  </SelectItem>
                                                )
                                              )}
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
                                  name={`forms.${index}.currencyCode`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Currency</FormLabel>
                                      <FormDescription>
                                        Which currency do you want to include in
                                        the property?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${index}.currencyCode`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a currency." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>
                                                Currency
                                              </SelectLabel>
                                              {CurrencyCodes.map((code) => (
                                                <SelectItem
                                                  key={code}
                                                  value={code}
                                                >
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
                                  name={`forms.${index}.timeZone`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Time Zone</FormLabel>
                                      <FormDescription>
                                        Which timeZone do you want to include in
                                        the property?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${index}.timeZone`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a timeZone." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>
                                                Timezone
                                              </SelectLabel>
                                              {TimeZones.map((timeZone) => (
                                                <SelectItem
                                                  key={timeZone}
                                                  value={timeZone}
                                                >
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
                                  name={`forms.${index}.industryCategory`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Category</FormLabel>
                                      <FormDescription>
                                        Which category do you want to include in
                                        the property?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(
                                            `forms.${index}.industryCategory`
                                          )}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a category." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>
                                                Timezone
                                              </SelectLabel>
                                              {Object.entries(
                                                IndustryCategories
                                              ).map(([label, value]) => (
                                                <SelectItem
                                                  key={value}
                                                  value={value}
                                                >
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
                              </form>
                            </Form>
                          </CardContent>
                        </Card>
                        {/* End Form */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* End Hire Us */}
          </motion.div>
        )}
      </AnimatePresence>

      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}

      {notFoundError && <NotFoundErrorModal />}
    </>
  );
};

export default FormCreateProperty;
