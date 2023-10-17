'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LimitReached } from '../../modals/limitReached';
import { ButtonGroup } from '../../ButtonGroup/ButtonGroup';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { z } from 'zod';
import { UpdateWorkspaceSchema } from '@/src/lib/schemas/workspaces';
import {
  clearSelectedRows,
  selectTable,
  setIsLimitReached,
} from '@/src/app/redux/tableSlice';
import { selectIsLoading, setLoading } from '@/src/app/redux/globalSlice';
import { useDispatch, useSelector } from 'react-redux';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FormUpdateWorkspaceProps,
  UpdateResult,
} from '@/types/types';
import logger from '@/src/lib/logger';
import { updateWorkspaces } from '@/src/lib/actions/workspaces';

// Type for the entire form data
type Forms = z.infer<typeof UpdateWorkspaceSchema>;

// Component
const FormUpdateWorkspace: React.FC<FormUpdateWorkspaceProps> = ({
  showOptions,
  onClose,
  selectedRows,
  accounts = [],
  workspaces = [],
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
          accountId: "",
          workspaceId: "",
          name: "",
          description: "",
          containerId: "",
        },
      ],
    },
    resolver: zodResolver(UpdateWorkspaceSchema),
  });

  const { fields } = useFieldArray({
    control,
    name: 'forms',
  });

  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((rowData: any) => {
      const accountId = rowData?.accountId || '';
      const containerId = rowData?.containerId || '';
      const workspaceId = rowData?.workspaceId || '';
      const name = rowData?.name || '';
      const description = rowData?.description || '';


      return {
        accountId,
        containerId,
        workspaceId,
        name,
        description,
      };
    });

    reset({ forms: initialForms });
  }, [selectedRows, reset]);

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true

    try {
      const formDataArray = forms.map((formElement) => {
        const obj = {};
        Object.keys(formElement).forEach((key) => {
          obj[key] = formElement[key];
        });
        return obj;
      });

      console.log('formDataArray', formDataArray);

      // If you're here, validation succeeded. Proceed with updateContainers.
      const res = (await updateWorkspaces({ forms })) as UpdateResult;

      dispatch(clearSelectedRows()); // Clear selectedRows

      // close the modal
      onClose();

      // Reset the forms here, regardless of success or limit reached
      reset({
      forms: [
        {
          accountId: "",
          workspaceId: "",
          name: "",
          description: "",
          containerId: "",
        },
      ],
      });

      if (res && res.success) {
        // Reset the forms here
        reset({
      forms: [
        {
          accountId: "",
          workspaceId: "",
          name: "",
          description: "",
          containerId: "",
        },
      ],
        });
      } else if (res && res.limitReached) {
        // Show the LimitReached modal
        dispatch(setIsLimitReached(true));
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
          accountId: "",
          workspaceId: "",
          name: "",
          description: "",
          containerId: "",
        },
      ],
    });

    dispatch(clearSelectedRows()); // Clear selectedRows

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
                <div
                  key={field.id}
                  className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                >
                  <div className="max-w-xl mx-auto">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
                        {field.name || `Workspace ${index + 1}`}
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
                                {...register(`forms.${index}.name`)}
                                defaultValue={field.name}
                                className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                              />
                              {errors.forms?.[index]?.name && (
                                <p className="text-red-500 text-xs italic">
                                  {
                                    errors.forms?.[index]?.name
                                      ?.message
                                  }
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
                              {errors.forms?.[index]?.description
                                ?.message && (
                                <p className="text-red-500 text-xs italic">
                                  {
                                    errors.forms?.[index]?.description
                                      ?.message
                                  }
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
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}
    </>
  );
};

export default FormUpdateWorkspace;
