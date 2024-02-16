'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { combineContainers } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { LimitReached } from '../../modals/limitReached';
import { ButtonGroup } from '../../ButtonGroup/ButtonGroup';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { z } from 'zod';
import { UpdateContainerSchema } from '@/src/lib/schemas/gtm/containers';
import { clearSelectedRows, selectTable, setIsLimitReached } from '@/src/redux/tableSlice';
import { selectIsLoading, setLoading } from '@/src/redux/globalSlice';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormUpdateContainerProps, UpdateContainersResult } from '@/src/types/types';

// Type for the entire form data
type Forms = z.infer<typeof UpdateContainerSchema>;

// Component
const FormCombineContainer: React.FC<FormUpdateContainerProps> = ({
  showOptions,
  onClose,
  selectedRows,
  accounts,
}) => {
  const dispatch = useDispatch();
  const { isLimitReached } = useSelector(selectTable);
  const isLoading = useSelector(selectIsLoading);
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<Forms>({
    defaultValues: {
      forms: [
        {
          accountId: '',
          usageContext: '',
          containerName: '',
          domainName: '',
          notes: '',
          containerId: '',
        },
      ],
    },
    resolver: zodResolver(UpdateContainerSchema),
  });

  const { fields } = useFieldArray({
    control,
    name: 'forms',
  });

  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((rowData: any) => {
      const accountId = rowData?.accountId || '';
      const containerName = rowData?.name || '';
      const domainName = rowData?.domainName || '';
      const notes = rowData?.notes || '';
      const usageContext = rowData?.usageContext ? rowData.usageContext[0] : '';

      const containerId = rowData?.containerId || '';

      return {
        accountId,
        usageContext,
        containerName,
        domainName,
        notes,
        containerId,
      };
    });

    reset({ forms: initialForms });
  }, [selectedRows, reset]);

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true

    try {
      // If you're here, validation succeeded. Proceed with updateContainers.
      const res = (await combineContainers({
        forms,
      })) as UpdateContainersResult;

      dispatch(clearSelectedRows()); // Clear selectedRows

      // close the modal
      onClose();

      // Reset the forms here, regardless of success or limit reached
      reset({
        forms: [
          {
            accountId: '',
            usageContext: '',
            containerName: '',
            domainName: '',
            notes: '',
            containerId: '',
          },
        ],
      });

      if (res && res.success) {
        // Reset the forms here
        reset({
          forms: [
            {
              accountId: '',
              usageContext: '',
              containerName: '',
              domainName: '',
              notes: '',
              containerId: '',
            },
          ],
        });
      } else if (res && res.limitReached) {
        // Show the LimitReached modal
        dispatch(setIsLimitReached(true));
      }
    } catch (error: any) {
      throw new Error(error);
    } finally {
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleClose = () => {
    // Reset the forms to their initial state
    reset({
      forms: [
        {
          accountId: '',
          usageContext: '',
          containerName: '',
          domainName: '',
          notes: '',
          containerId: '',
        },
      ],
    });

    dispatch(clearSelectedRows()); // Clear selectedRows

    // Close the modal
    onClose();
  };

  const selectedAccountIds = Object.values(selectedRows).map((row: any) => row.accountId);

  const uniqueSelectedAccountIds = Array.from(new Set(selectedAccountIds));

  const filteredAccounts = Array.isArray(accounts?.data)
    ? accounts.data.filter((account) => uniqueSelectedAccountIds.includes(account.accountId))
    : [];

  const filteredUsageContexts = Object.values(selectedRows).map((row: any) => row.usageContext[0]);

  return (
    <>
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-start z-50 bg-white-500 overflow-y-auto"
          >
            {/* Close Button */}
            <button onClick={handleClose} className="absolute top-0 right-0 font-bold py-2 px-4">
              <XMarkIcon className="w-14 h-14" />
            </button>

            <ButtonGroup
              buttons={[
                {
                  text: isLoading ? 'Submitting...' : 'Submit',
                  type: 'submit',
                  form: 'updateContainer',
                },
              ]}
            />

            {/* Hire Us */}
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => (
                <div key={field.id} className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                  <div className="max-w-xl mx-auto">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
                        {field.containerName || `Container ${index + 1}`}
                      </p>
                    </div>

                    <div className="mt-12">
                      {/* Form */}
                      <form
                        ref={(el) => (formRefs.current[index] = el)}
                        onSubmit={handleSubmit(processForm)}
                        id="updateContainer"
                      >
                        <div className="grid gap-4 lg:gap-6">
                          {/* Grid */}
                          <div className="grid grid-cols-1 gap-4 lg:gap-6">
                            <div>
                              <label
                                htmlFor="hs-firstname-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                New Container Name:
                              </label>
                              <input
                                type="text"
                                {...register(`forms.${index}.containerName`)}
                                defaultValue={field.containerName}
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.containerName && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.containerName?.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="hs-lastname-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                Account
                              </label>
                              <select
                                {...register(`forms.${index}.accountId`)}
                                defaultValue={field.accountId}
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              >
                                {filteredAccounts.map((account: any) => (
                                  <option key={account.accountId}>{account.accountId}</option>
                                ))}
                              </select>
                              {errors.forms?.[index]?.accountId && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.accountId?.message}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* End Grid */}

                          <div>
                            <label
                              htmlFor="hs-work-email-hire-us-2"
                              className="block text-sm text-gray-700 font-medium dark:text-white"
                            >
                              Usage Context (Immutable):
                            </label>

                            <select
                              {...register(`forms.${index}.usageContext`)}
                              defaultValue={field.usageContext[0]}
                              className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                            >
                              {filteredUsageContexts.map((usageContext) => (
                                <option key={usageContext}>{usageContext}</option>
                              ))}
                            </select>
                            {errors.forms?.[index]?.usageContext && (
                              <p className="text-red-500 text-xs italic">
                                {errors.forms?.[index]?.usageContext?.message}
                              </p>
                            )}
                          </div>

                          {/* Grid */}
                          <div className="grid grid-cols-1 gap-4 lg:gap-6">
                            <div>
                              <label
                                htmlFor="hs-company-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                Domain Name: Optional (Must be comma separated)
                              </label>

                              <input
                                type="text"
                                {...register(`forms.${index}.domainName`)}
                                defaultValue={field.domainName}
                                placeholder="Enter domain names separated by commas"
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.domainName && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.domainName?.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="hs-company-website-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                Notes: Optional
                              </label>

                              <input
                                type="text"
                                {...register(`forms.${index}.notes`)}
                                defaultValue={field.notes}
                                placeholder="Enter Note"
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.notes && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.notes?.message}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* End Grid */}
                        </div>
                        {/* End Grid */}
                      </form>
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

      {isLimitReached && <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />}
    </>
  );
};

export default FormCombineContainer;
