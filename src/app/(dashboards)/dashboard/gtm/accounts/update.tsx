'use client'; // Ensures that this file is only used in a client-side environment

// Importing necessary hooks and functions from Redux and other libraries
import { useDispatch, useSelector } from 'react-redux';
import {
  clearSelectedRows,
  selectTable,
  setIsLimitReached,
} from '@/src/app/redux/tableSlice';
import { selectIsLoading, setLoading } from '@/src/app/redux/globalSlice';
import { useEffect, useRef } from 'react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import logger from '@/src/lib/logger';
import { z } from 'zod';
import { UpdateAccountSchema } from '@/src/lib/schemas/accounts';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { ButtonGroup } from '../../../../../components/client/ButtonGroup/ButtonGroup';
import { LimitReached } from '../../../../../components/client/modals/limitReached';
import { UpdateResult } from '@/src/lib/types/types';

// Defining the type for form data using Zod
type Forms = z.infer<typeof UpdateAccountSchema>;

// Functional component for updating account forms
function AccountFormUpdate({ showOptions, onClose, selectedRows }) {
  // Using Redux hooks for dispatching actions and selecting state
  const dispatch = useDispatch();
  const { isLimitReached } = useSelector(selectTable);
  const isLoading = useSelector(selectIsLoading);

  // useRef to keep track of form elements
  const formRefs = useRef<(HTMLFormElement | null)[]>([]);

  // Setting up form handling using react-hook-form with Zod for validation
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<Forms>({
    defaultValues: {
      forms: [{ accountId: '', name: '' }],
    },
    resolver: zodResolver(UpdateAccountSchema),
  });

  // Managing dynamic form fields using react-hook-form
  const { fields } = useFieldArray({ control, name: 'forms' });

  // useEffect to reset form values based on selected rows
  useEffect(() => {
    const initialForms = Object.values(selectedRows).map((account: any) => ({
      accountId: account?.accountId || '',
      name: account?.name || '',
    }));
    reset({ forms: initialForms });
  }, [selectedRows, reset]);

  // Function to process form submission
  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;

    // Dispatching loading state
    dispatch(setLoading(true));

    try {
      // Updating accounts with the API call
      const res = (await updateAccounts({ forms })) as UpdateResult;

      // Clearing selected rows and closing the form on success
      dispatch(clearSelectedRows());
      onClose();
      reset({ forms: [{ accountId: '', name: '' }] });

      // Handling response based on success or limit reached
      if (res && res.success) {
        // Reset the forms here
        reset({
          forms: [
            {
              accountId: '',
              name: '',
            },
          ],
        });
      } else if (res && res.limitReached) {
        // Show the LimitReached modal
        dispatch(setIsLimitReached(true));
      }
    } catch (error) {
      // Logging errors
      logger.error('Error updating accounts:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Function to handle form close
  const handleClose = () => {
    reset({ forms: [{ accountId: '', name: '' }] });
    dispatch(clearSelectedRows());
    onClose();
  };

  return (
    <AnimatePresence>
      {showOptions && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-start z-50 bg-white overflow-y-auto"
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
                form: 'updateAccount',
              },
            ]}
          />

          <div className="container mx-auto /* ...container props */">
            {fields.map((field, index) => (
              <div key={field.id} /* ...div props */>
                {/* Form and other UI elements */}
                <form
                  ref={(el) => (formRefs.current[index] = el)}
                  onSubmit={handleSubmit(processForm)}
                  id="updateAccount"
                >
                  <div className="grid gap-4 lg:gap-6">
                    {/* Grid */}
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                      <div className="pb-10">
                        <label
                          htmlFor="accountId"
                          className="block text-sm text-gray-700 font-medium dark:text-white"
                        >
                          Current Account Name: {field.name}
                        </label>
                        <input
                          type="text"
                          {...register(`forms.${index}.name`)}
                          placeholder="New Account Name"
                          className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue focus:ring-blue dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
                        />
                        {errors.forms?.[index]?.name && (
                          <p className="text-red text-xs italic">
                            {errors.forms?.[index]?.name?.message}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* End Grid */}

                    {/* End Grid */}
                  </div>
                </form>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}
    </AnimatePresence>
  );
}

export default AccountFormUpdate;
