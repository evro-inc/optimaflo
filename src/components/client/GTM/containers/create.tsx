'use client';
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createContainers } from '@/src/lib/actions/containers';
import { LimitReached } from '../../modals/limitReached';
import { ButtonGroup } from '../../ButtonGroup/ButtonGroup';
import { XMarkIcon } from '@heroicons/react/24/solid';
import {
  CreateResult,
  FormCreateContainerProps,
} from '@/types/types';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import { selectGlobal, setLoading } from '@/src/app/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { CreateContainerSchema } from '@/src/lib/schemas/containers';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import logger from '@/src/lib/logger';

type Forms = z.infer<typeof CreateContainerSchema>;

const FormCreateContainer: React.FC<FormCreateContainerProps> = ({
  showOptions,
  onClose,
  accounts = [],
}) => {
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    control,
    reset,
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
    resolver: zodResolver(CreateContainerSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'forms',
  });

  const { isLimitReached, loading } = useSelector((state) => ({
    ...selectTable(state),
    ...selectGlobal(state),
  }));

  const addForm = () => {
    append({
      accountId: '',
      usageContext: '',
      containerName: '',
      domainName: '',
      notes: '',
      containerId: '',
    });
  };

  const removeForm = () => {
    if (fields.length > 1) {
      remove(fields.length - 1);
    }
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    try {
      const res = (await createContainers({ forms })) as CreateResult;

      if (res.limitReached) {
        dispatch(setIsLimitReached(true)); // Set limitReached to true using Redux action
      }

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
        setIsLimitReached(true);
      }
    } catch (error) {
      logger.error('Error creating containers:', error);

      return { success: false };
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

    // Close the modal
    onClose();
  };

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
            <button
              onClick={handleClose}
              className="absolute top-0 right-0 font-bold py-2 px-4"
            >
              <XMarkIcon className="w-14 h-14" />
            </button>

            <ButtonGroup
              buttons={[
                { text: 'Add Form', onClick: addForm },
                { text: 'Remove Form', onClick: removeForm },
                {
                  text: loading ? 'Submitting...' : 'Submit',
                  type: 'submit',
                  form: 'createContainer',
                },
              ]}
            />

            {/* Hire Us */}
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                >
                  <div className="max-w-xl mx-auto">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
                        Container {index + 1}
                      </p>
                    </div>

                    <div className="mt-12">
                      {/* Form */}
                      <form
                        ref={(el) => (formRefs.current[index] = el)}
                        onSubmit={handleSubmit(processForm)}
                        id="createContainer"
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
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.containerName
                                ?.message && (
                                <p className="text-red-500 text-xs italic">
                                  {
                                    errors.forms?.[index]?.containerName
                                      ?.message
                                  }
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
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              >
                                {Array.isArray(accounts?.data) &&
                                  accounts.data.map((account: any) => (
                                    <option key={account.accountId}>
                                      {account.accountId}
                                    </option>
                                  ))}
                              </select>
                              {errors.forms?.[index]?.accountId?.message && (
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
                              Usage Context:
                            </label>

                            <select
                              {...register(`forms.${index}.usageContext`)}
                              className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                            >
                              <option value="web">Web</option>
                              <option value="androidSdk5">Android</option>
                              <option value="iosSdk5">IOS</option>
                            </select>
                            {errors.forms?.[index]?.usageContext?.message && (
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
                                placeholder="Enter domain names separated by commas"
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.domainName?.message && (
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
                                placeholder="Enter Note"
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.notes?.message && (
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

      {isLimitReached && (
        <LimitReached onClose={() => dispatch(isLimitReached(false))} /> // Use Redux action for onClose
      )}
    </>
  );
};

export default FormCreateContainer;
