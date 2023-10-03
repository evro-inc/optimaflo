'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createContainers } from '@/src/lib/actions';
import { LimitReached } from '../../modals/limitReached';
import { ButtonGroup } from '../../ButtonGroup/ButtonGroup';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { z } from 'zod';
import { showToast } from '../../Toast/Toast';
import { CreateContainerSchema } from '@/src/lib/schemas';
import { Form } from '@/types/types';

const FormsSchema = z.array(CreateContainerSchema);

type CreateContainersResult = {
  success: boolean;
  limitReached?: boolean;
  message?: string;
  createdContainers?: any[];
  error?: string;
};

type FormCreateContainerProps = {
  showOptions: boolean;
  onClose: () => void;
  accounts: any; // Replace 'any' with the actual type if known
};

const FormCreateContainer: React.FC<FormCreateContainerProps> = ({
  showOptions,
  onClose,
  accounts = [],
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [forms, setForms] = useState<Form[]>([
    {
      accountId: '',
      usageContext: '',
      containerName: '',
      domainName: '',
      notes: '',
    },
  ]);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [showLoadingToast, setShowLoadingToast] = useState(false);

  const addForm = () => {
    setForms([
      ...forms,
      {
        accountId: '',
        usageContext: '',
        containerName: '',
        domainName: '',
        notes: '',
      },
    ]);
  };

  const removeForm = () => {
    if (forms.length > 1) {
      setForms(forms.slice(0, -1));
    }
  };

  const handleInputChange = (e, index, field) => {
    const newForms = [...forms];
    newForms[index][field] = e.target.value;
    setForms(newForms);
  };

  useEffect(() => {
    if (showLoadingToast) {
      showToast({
        variant: 'promise',
        message: 'Creating container...',
        error: 'An error occurred with container creation',
      });
    }
  }, [showLoadingToast]);

  const handleSubmit = async () => {
    setIsLoading(true); // Set loading to true
    setShowLoadingToast(true); // Show the loading toast

    try {
      const mappedData = forms.map((form, index) => {
        const formInstance = new FormData(document.forms[index]);
        return formInstance;
      });

      // Transform FormData to Form shape
      const transformedData: Form[] = mappedData.map((formData) => {
        // Transform FormData to Form shape
        return {
          accountId: formData.get('accountId') as string,
          usageContext: formData.get('usageContext') as string,
          containerName: formData.get('containerName') as string,
          domainName: formData.get('domainName') as string,
          notes: formData.get('notes') as string,
        };
      });

      // Validate using Zod
      const validationResult = FormsSchema.safeParse(transformedData);
      if (!validationResult.success) {
        let errorMessage = '';

        validationResult.error.format();

        validationResult.error.issues.forEach((issue) => {
          errorMessage =
            errorMessage + issue.path[0] + ': ' + issue.message + '. ';
        });
        const formattedErrorMessage = errorMessage
          .split(':')
          .slice(1)
          .join(':')
          .trim();

        showToast({ variant: 'error', message: formattedErrorMessage });

        return;
      }

      if (validationResult.success) {
        const formDataArray = validationResult.data.map((obj) => {
          const formData = JSON.stringify(obj);
          return formData;
        });

        const parsedFormDataArray = formDataArray.map((item) =>
          JSON.parse(item)
        );

        // If you're here, validation succeeded. Proceed with createContainers.
        const res = (await createContainers(
          parsedFormDataArray
        )) as CreateContainersResult;

        if (res.success) {
          showToast({ variant: 'success', message: 'Container(s) created.' });
        }

        if (res?.error) {
          showToast({ variant: 'error', message: res.error });
        }

        // close the modal
        onClose();

        // Reset the forms here, regardless of success or limit reached
        setForms([
          {
            accountId: '',
            usageContext: '',
            containerName: '',
            domainName: '',
            notes: '',
          },
        ]);

        if (res && res.success) {
          // Reset the forms here
          setForms([
            {
              accountId: '',
              usageContext: '',
              containerName: '',
              domainName: '',
              notes: '',
            },
          ]);
        } else if (res && res.limitReached) {
          // Show the LimitReached modal
          setIsLimitReached(true);
        }
      }
    } catch (error) {
      console.error('Error creating containers:', error);
      showToast({ variant: 'error', message: 'An unexpected error occurred.' });

      return { success: false };
    } finally {
      setIsLoading(false); // Set loading to false
      setShowLoadingToast(false); // Hide the loading toast
    }
  };

  const handleClose = () => {
    // Reset the forms to their initial state
    setForms([
      {
        accountId: '',
        usageContext: '',
        containerName: '',
        domainName: '',
        notes: '',
      },
    ]);

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
                  text: isLoading ? 'Submitting...' : 'Submit',
                  type: 'submit',
                  form: 'createContainer',
                },
              ]}
            />

            {/* Hire Us */}
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-end">
              {forms.map((form, index) => (
                <div
                  key={index}
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
                        onSubmit={(e) => {
                          e.preventDefault();
                          setShowLoadingToast(true);
                          handleSubmit();
                        }}
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
                                name="containerName"
                                value={form.containerName}
                                onChange={(e) =>
                                  handleInputChange(e, index, 'containerName')
                                }
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="hs-lastname-hire-us-2"
                                className="block text-sm text-gray-700 font-medium dark:text-white"
                              >
                                Account
                              </label>
                              <select
                                name="accountId"
                                value={form.accountId}
                                onChange={(e) =>
                                  handleInputChange(e, index, 'accountId')
                                }
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              >
                                {Array.isArray(accounts?.data) &&
                                  accounts.data.map((account: any) => (
                                    <option key={account.accountId}>
                                      {account.accountId}
                                    </option>
                                  ))}
                              </select>
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
                              value={form.usageContext}
                              name="usageContext"
                              onChange={(e) =>
                                handleInputChange(e, index, 'usageContext')
                              }
                              className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                            >
                              <option value="WEB">Web</option>
                              <option value="androidSdk5">Android</option>
                              <option value="iosSdk5">IOS</option>
                            </select>
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
                                name="domainName"
                                onChange={(e) =>
                                  handleInputChange(e, index, 'domainName')
                                }
                                value={form.domainName}
                                placeholder="Enter domain names separated by commas"
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
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
                                name="notes"
                                onChange={(e) =>
                                  handleInputChange(e, index, 'notes')
                                }
                                placeholder="Enter Note"
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
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
        <LimitReached onClose={() => setIsLimitReached(false)} />
      )}
    </>
  );
};

export default FormCreateContainer;
