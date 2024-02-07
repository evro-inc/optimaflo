'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LimitReached } from '../../../../../components/client/modals/limitReached';
import { ButtonGroup } from '../../../../../components/client/ButtonGroup/ButtonGroup';
import { z } from 'zod';
import {
  clearSelectedRows,
  selectTable,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/lib/redux/tableSlice';
import { selectIsLoading, setLoading } from '@/src/lib/redux/globalSlice';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FeatureResponse, FormUpdateProps } from '@/src/lib/types/types';
import { toast } from 'sonner';
import { Icon } from '../../../../../components/client/Button/Button';
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
import dynamic from 'next/dynamic';
import { UpdatePropertySchema } from '@/src/lib/schemas/ga/properties';
import {
  updateDataRetentionSettings,
  updateProperties,
} from '@/src/lib/fetch/dashboard/actions/ga/properties';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  CurrencyCodes,
  IndustryCategories,
  TimeZones,
  retentionSettings360,
  retentionSettingsStandard,
} from './propertyItems';
import { Switch } from '@/src/components/ui/switch';

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

// Type for the entire form data
type Forms = z.infer<typeof UpdatePropertySchema>;

// Component
const FormUpdateProperty: React.FC<FormUpdateProps> = ({
  showOptions,
  onClose,
  selectedRows,
  table,
}) => {
  const isLoading = useSelector(selectIsLoading);
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const dispatch = useDispatch();
  const isLimitReached = useSelector(selectTable).isLimitReached;
  const notFoundError = useSelector(selectTable).notFoundError;

  const form = useForm<Forms>({
    defaultValues: {
      forms: [
        {
          name: selectedRows[0].name,
          parent: selectedRows[0].parent,
          currencyCode: selectedRows[0].currencyCode,
          displayName: '',
          industryCategory: selectedRows[0].industryCategory,
          timeZone: selectedRows[0].timeZone,
          propertyType: selectedRows[0].propertyType,
          retention: selectedRows[0].retention,
          resetOnNewActivity: selectedRows[0].resetOnNewActivity,
        },
      ],
    },
    resolver: zodResolver(UpdatePropertySchema),
  });

  console.log('form', form.getValues());

  const { fields } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((rowData: any) => {
      const name = rowData.name;
      const parent = rowData.parent;
      const currencyCode = rowData.currencyCode;
      const displayName = rowData.displayName;
      const industryCategory = rowData.industryCategory;
      const timeZone = rowData.timeZone;
      const propertyType = rowData.propertyType;
      const retention = rowData.retention;
      const resetOnNewActivity = rowData.resetOnNewActivity;

      return {
        name,
        parent,
        currencyCode,
        displayName,
        industryCategory,
        timeZone,
        propertyType,
        retention,
        resetOnNewActivity,
      };
    });

    form.reset({ forms: initialForms });
  }, [selectedRows, form]);

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true

    toast('Updating properties...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    try {
      // If you're here, validation succeeded. Proceed with updateContainers.
      const res = (await updateProperties({ forms })) as FeatureResponse;
      const resUserDataRetention = await updateDataRetentionSettings({ forms });

      dispatch(clearSelectedRows()); // Clear selectedRows

      if (res.success && resUserDataRetention.success) {
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
        if (res.notFoundError || resUserDataRetention.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create property ${result.name}. Please check your access permissions. Any other properties created were successful.`,
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

        if (res.limitReached || resUserDataRetention.limitReached) {
          res.results.forEach((result) => {
            if (result.limitReached) {
              toast.error(
                `Unable to create property ${result.name}. You have ${result.remaining} more property(s) you can create.`,
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
          forms: [
            {
              name: selectedRows[0].name,
              parent: selectedRows[0].parent,
              currencyCode: selectedRows[0].currencyCode,
              displayName: '',
              industryCategory: selectedRows[0].industryCategory,
              timeZone: selectedRows[0].timeZone,
              propertyType: selectedRows[0].propertyType,
              retention: selectedRows[0].retention,
              resetOnNewActivity: selectedRows[0].resetOnNewActivity,
            },
          ],
        });
      }
      onClose();

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [
          {
            name: selectedRows[0].name,
            parent: selectedRows[0].parent,
            currencyCode: selectedRows[0].currencyCode,
            displayName: '',
            industryCategory: selectedRows[0].industryCategory,
            timeZone: selectedRows[0].timeZone,
            propertyType: selectedRows[0].propertyType,
            retention: selectedRows[0].retention,
            resetOnNewActivity: selectedRows[0].resetOnNewActivity,
          },
        ],
      });
    } catch (error: any) {
      throw new Error(error);
    } finally {
      //table.setRowSelection({});
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleClose = () => {
    // Reset the forms to their initial state
    form.reset({
      forms: [
        {
          name: selectedRows[0].name,
          parent: selectedRows[0].parent,
          currencyCode: selectedRows[0].currencyCode,
          displayName: '',
          industryCategory: selectedRows[0].industryCategory,
          timeZone: selectedRows[0].timeZone,
          propertyType: selectedRows[0].propertyType,
          retention: selectedRows[0].retention,
          resetOnNewActivity: selectedRows[0].resetOnNewActivity,
        },
      ],
    });

    dispatch(clearSelectedRows()); // Clear selectedRows
    //table.setRowSelection({});

    // Close the modal
    onClose();
  };
  const retentionSettings = Array.from(selectedRows.values()).map(
    (row) => row.serviceLevel
  );

  const retentionByServiceLevel = retentionSettings.map((setting) =>
    setting === 'Standard' ? retentionSettingsStandard : retentionSettings360
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
            <Icon
              className="absolute top-5 right-5 font-bold py-2 px-4"
              text="Close"
              icon={<Cross1Icon />}
              variant="create"
              onClick={handleClose}
              billingInterval={undefined}
            />
            <ButtonGroup
              buttons={[
                {
                  text: isLoading ? 'Submitting...' : 'Submit',
                  type: 'submit',
                  form: 'updateProperty',
                },
              ]}
            />

            {/* Hire Us */}
            <div className="property mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                >
                  <div className="max-w-xl mx-auto">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
                        {field.displayName || `Property ${index + 1}`}
                      </p>
                    </div>

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
                              id="updateProperty"
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
                                            <SelectLabel>Currency</SelectLabel>
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
                                            <SelectLabel>Timezone</SelectLabel>
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
                                              Industry Category
                                            </SelectLabel>
                                            {IndustryCategories.map((cat) => (
                                              <SelectItem key={cat} value={cat}>
                                                {cat}
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
                                name={`forms.${index}.retention`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Retention Setting</FormLabel>
                                    <FormDescription>
                                      Set the retention setting for the
                                      property.
                                    </FormDescription>
                                    <FormControl>
                                      <Select
                                        {...form.register(
                                          `forms.${index}.retention`
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
                                              Retention Setting
                                            </SelectLabel>
                                            {Object.entries(
                                              retentionByServiceLevel[index]
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

                              <FormField
                                control={form.control}
                                name={`forms.${index}.resetOnNewActivity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <div className="space-y-0.5">
                                      <FormLabel>
                                        Reset user data on new activity
                                      </FormLabel>
                                      <FormDescription>
                                        If enabled, reset the retention period
                                        for the user identifier with every event
                                        from that user.
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
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
              ))}
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

export default FormUpdateProperty;
