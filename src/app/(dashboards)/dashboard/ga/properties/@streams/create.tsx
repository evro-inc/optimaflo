'use client';
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ButtonGroup } from '@/components/client/ButtonGroup/ButtonGroup';
import { FeatureResponse, FormCreateProps, GA4StreamType } from '@/src/types/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { selectGlobal, setLoading, toggleCreate } from '@/src/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Cross1Icon } from '@radix-ui/react-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
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
import { FormsSchema } from '@/src/lib/schemas/ga/streams';
import { LimitReached } from '@/src/components/client/modals/limitReached';
import { z } from 'zod';
import { createGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';
import { streamType } from './streamItems';

const NotFoundErrorModal = dynamic(
  () => import('@/components/client/modals/notFoundError').then((mod) => mod.NotFoundError),
  { ssr: false }
);

type Forms = z.infer<typeof FormsSchema>;

const FormCreateStream: React.FC<FormCreateProps> = ({
  properties = [],
  table = [],
  accounts = [],
}) => {
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const dispatch = useDispatch();
  const { loading } = useSelector(selectGlobal);
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;
  const { showCreate } = useSelector(selectGlobal);

  const onClose = () => dispatch(toggleCreate());

  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter((property) => property.parent === account.name);

      return {
        ...account,
        properties: accountProperties,
      };
    })
    .filter((account) => account.properties.length > 0);

  const formDataDefaults: GA4StreamType = {
    account: accountsWithProperties[0].name,
    property: table[0].parent,
    displayName: '',
    parentURL: '',
    type: table[0].type,
    webStreamData: {
      defaultUri: '',
    },
    androidAppStreamData: {
      packageName: '',
    },
    iosAppStreamData: {
      bundleId: '',
    },
    name: '',
    accountId: '',
    parent: '',
  };

  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const addForm = () => {
    append(formDataDefaults);
  };

  const removeForm = () => {
    if (fields.length > 1) {
      remove(fields.length - 1);
    }
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    toast('Creating streams...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueStreams = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.displayName}`;
      if (uniqueStreams.has(identifier)) {
        toast.error(`Duplicate stream found for ${form.property} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueStreams.add(identifier);
    }

    try {
      const res = (await createGAPropertyStreams({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Stream ${result.name} created successfully. The table will update shortly.`,
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
                `Unable to create stream ${result.name}. Please check your access permissions. Any other streams created were successful.`,
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
                `Unable to create stream ${result.name}. You have ${result.remaining} more stream(s) you can create.`,
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
          forms: [formDataDefaults],
        });
      }

      onClose();

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [formDataDefaults],
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
      forms: [formDataDefaults],
    });

    // Close the modal
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {showCreate && (
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
              <Cross1Icon className="h-4 w-4" /> <span className="sr-only">Close</span>
            </Button>

            <div className="flex items-center justify-between py-3 px-4 mt-5 gap-4">
              <ButtonGroup
                buttons={[
                  { text: 'Add Form', onClick: addForm },
                  { text: 'Remove Form', onClick: removeForm },
                  {
                    text: loading ? 'Submitting...' : 'Submit',
                    type: 'submit',
                    form: 'createStream',
                  },
                ]}
              />
            </div>

            <div className="stream mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => {
                const selectedAccountId = form.watch(`forms.${index}.account`);

                const filteredProperties = properties.filter(
                  (property) => property.parent === selectedAccountId
                );

                return (
                  <div key={field.id} className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                    <div className="max-w-xl mx-auto">
                      <div className="mt-12">
                        {/* Form */}

                        <Card className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
                          <CardHeader className="bg-gray-100 p-4">
                            <CardTitle className="text-lg font-semibold">
                              Stream {index + 1}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <Form {...form}>
                              <form
                                ref={(el) => (formRefs.current[index] = el)}
                                onSubmit={form.handleSubmit(processForm)}
                                id="createStream"
                                className="space-y-6"
                              >
                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Stream Name</FormLabel>
                                      <FormDescription>
                                        This is the stream name you want to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Name of the stream"
                                          {...form.register(`forms.${index}.displayName`)}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.account`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Account</FormLabel>
                                      <FormDescription>
                                        This is the account you want to create the property in.
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${index}.account`)}
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
                                  name={`forms.${index}.property`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Property</FormLabel>
                                      <FormDescription>
                                        Which property do you want to create the stream in?
                                      </FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${index}.property`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a property." />
                                          </SelectTrigger>

                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Property</SelectLabel>
                                              {filteredProperties.length > 0 ? (
                                                filteredProperties.map((property) => (
                                                  <SelectItem
                                                    key={property.name}
                                                    value={property.name}
                                                  >
                                                    {property.displayName}
                                                  </SelectItem>
                                                ))
                                              ) : (
                                                <SelectItem value="" disabled>
                                                  No properties available
                                                </SelectItem>
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
                                  name={`forms.${index}.type`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Stream Type</FormLabel>
                                      <FormDescription>Set the stream type.</FormDescription>
                                      <FormControl>
                                        <Select
                                          {...form.register(`forms.${index}.type`)}
                                          {...field}
                                          onValueChange={field.onChange}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a stream type." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>Retention Setting</SelectLabel>
                                              {Object.entries(streamType).map(([label, value]) => (
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

                                {Object.keys(streamType).map(
                                  (type) =>
                                    form.watch(`forms.${index}.type`) === streamType[type] && (
                                      <FormField
                                        control={form.control}
                                        name={`forms.${index}.${
                                          type.toLowerCase() === 'web'
                                            ? 'webStreamData.defaultUri'
                                            : type.toLowerCase() === 'android'
                                            ? 'androidAppStreamData.packageName'
                                            : 'iosAppStreamData.bundleId'
                                        }`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>{type} Input</FormLabel>
                                            <FormDescription>
                                              This is the input for {type}.
                                            </FormDescription>
                                            <FormControl>
                                              <Input
                                                placeholder={`Enter ${type} input`}
                                                {...form.register(
                                                  `forms.${index}.${
                                                    type.toLowerCase() === 'web'
                                                      ? 'webStreamData.defaultUri'
                                                      : type.toLowerCase() === 'android'
                                                      ? 'androidAppStreamData.packageName'
                                                      : 'iosAppStreamData.bundleId'
                                                  }`
                                                )}
                                                {...field}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    )
                                )}
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

      {isLimitReached && <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />}

      {notFoundError && <NotFoundErrorModal />}
    </>
  );
};

export default FormCreateStream;
