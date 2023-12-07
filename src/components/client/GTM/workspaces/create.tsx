'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LimitReached } from '../../modals/limitReached';
import { ButtonGroup } from '../../ButtonGroup/ButtonGroup';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { CreateResult, FormCreateWorkspaceProps } from '@/src/lib/types/types';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import { selectGlobal, setLoading } from '@/src/app/redux/globalSlice';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { CreateWorkspaceSchema } from '@/src/lib/schemas/workspaces';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import logger from '@/src/lib/logger';
import { createWorkspaces } from '@/src/lib/fetch/dashboard/gtm/actions/workspaces';
import { useAuth } from '@clerk/nextjs';

type Forms = z.infer<typeof CreateWorkspaceSchema>;

const FormCreateWorkspace: React.FC<FormCreateWorkspaceProps> = ({
  showOptions,
  onClose,
  accounts = [],
  workspaces = [],
}) => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);
  const dispatch = useDispatch();
  const { getToken } = useAuth();
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

          name: '',
          description: '',
          containerId: '',
        },
      ],
    },
    resolver: zodResolver(CreateWorkspaceSchema),
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

      name: '',
      description: '',
      containerId: '',
    });
  };

  const removeForm = () => {
    if (fields.length > 1) {
      remove(fields.length - 1);
    }
  };
  useEffect(() => {
    // Initialize selectedAccounts array with empty strings for each field
    setSelectedAccounts(fields.map(() => ''));
  }, [fields]);

  const handleAccountChange = (accountId: string, index: number) => {
    const updatedAccounts = [...selectedAccounts];
    updatedAccounts[index] = accountId;
    setSelectedAccounts(updatedAccounts);
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    const token = (await getToken()) as string;

    try {
      const res = (await createWorkspaces({ forms }, token)) as CreateResult;

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
            name: '',
            description: '',
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
              name: '',
              description: '',
              containerId: '',
            },
          ],
        });
      } else if (res && res.limitReached) {
        // Show the LimitReached modal
        setIsLimitReached(true);
      }
    } catch (error) {
      logger.error('Error creating workspaces:', error);

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
          name: '',
          description: '',
          containerId: '',
        },
      ],
    });

    // Close the modal
    onClose();
  };

  const uniqueAccountIds: string[] = Array.from(
    new Set(accounts.map((account) => account.accountId))
  );

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
                  form: 'createWorkspace',
                },
              ]}
            />

            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                >
                  <div className="max-w-xl mx-auto">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
                        Workspace {index + 1}
                      </p>
                    </div>

                    <div className="mt-12">
                      {/* Form */}
                      <form
                        ref={(el) => (formRefs.current[index] = el)}
                        onSubmit={handleSubmit(processForm)}
                        id="createWorkspace"
                      >
                        <div className="grid gap-4 lg:gap-6">
                          {/* Grid */}
                          <div className="grid grid-cols-1 gap-4 lg:gap-6">
                            <div>
                              <label
                                htmlFor="hs-firstname-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                New Workspace Name:
                              </label>
                              <input
                                type="text"
                                {...register(`forms.${index}.name`)}
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.name?.message && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.name?.message}
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
                                onChange={(e) =>
                                  handleAccountChange(e.target.value, index)
                                }
                              >
                                <option value="">Select an account</option>
                                {uniqueAccountIds.map((accountId: string) => (
                                  <option key={accountId} value={accountId}>
                                    {accountId}
                                  </option>
                                ))}
                              </select>
                              {errors.forms?.[index]?.accountId?.message && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.accountId?.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="hs-lastname-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                Container
                              </label>
                              <select
                                {...register(`forms.${index}.containerId`)}
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                                disabled={!selectedAccounts[index]}
                              >
                                {!selectedAccounts[index] ? (
                                  <option value="">Select a container</option>
                                ) : (
                                  workspaces
                                    .filter(
                                      (workspace) =>
                                        workspace.accountId ===
                                        selectedAccounts[index]
                                    )
                                    .map((workspace) => workspace.containerId)
                                    .filter(
                                      (value, idx, self) =>
                                        self.indexOf(value) === idx
                                    )
                                    .map((containerId) => (
                                      <option
                                        key={containerId}
                                        value={containerId}
                                      >
                                        {
                                          workspaces.find(
                                            (w) => w.containerId === containerId
                                          )?.containerName
                                        }
                                      </option>
                                    ))
                                )}
                              </select>
                              {errors.forms?.[index]?.containerId?.message && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.containerId?.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="hs-firstname-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                Description:
                              </label>
                              <input
                                type="text"
                                {...register(`forms.${index}.description`)}
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.description?.message && (
                                <p className="text-red-500 text-xs italic">
                                  {errors.forms?.[index]?.description?.message}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* End Grid */}

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

export default FormCreateWorkspace;
