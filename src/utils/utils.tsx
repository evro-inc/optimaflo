import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Dispatch } from 'redux';
import { SubmitHandler, useFormContext } from 'react-hook-form';
import { setCount, setLoading } from '@/redux/formSlice';
import { FeatureResponse } from '../types/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { setErrorDetails, setIsLimitReached, setNotFoundError } from '../redux/tableSlice';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const handleAmountChange = (
  selectedAmount: string,
  form: ReturnType<typeof useFormContext>,
  addForm: () => void,
  dispatch: Dispatch
) => {
  const amount = parseInt(selectedAmount);
  form.reset({ forms: [] });

  for (let i = 0; i < amount; i++) {
    addForm();
  }

  dispatch(setCount(amount));
};


// Define a type constraint for forms that include the `parent` field
type FormWithParent = { parent: string; name: string; displayName: string };

// Make processForm generic to accept different types of forms
export const processForm = <TFormValues extends FormWithParent>(
  apiCall: (data: { forms: TFormValues[] }) => Promise<FeatureResponse>,
  formDataDefaults: TFormValues,
  resetForm: () => void,
  dispatch: Dispatch,
  router: ReturnType<typeof useRouter>
): SubmitHandler<{ forms: TFormValues[] }> => {
  return async (data) => {
    const { forms } = data;
    dispatch(setLoading(true));

    toast('Processing your request...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueFeatures = new Set(forms.map((form) => form.parent));

    for (const form of forms) {
      const identifier = `${form.parent} - ${form.name} - ${form.displayName}`;
      if (uniqueFeatures.has(identifier)) {
        toast.error(`Duplicate feature found for ${form.name} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueFeatures.add(identifier);
    }

    try {
      const res = await apiCall({ forms });

      console.log('res:', res);


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


        router.push('/dashboard/ga/properties');
      } else {
        handleErrors(res, dispatch);
      }

      resetForm();
    } catch (error) {
      console.log('err:', error);

      toast.error('An unexpected error occurred.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    } finally {
      dispatch(setLoading(false));
    }
  };
};

const handleErrors = (res: FeatureResponse, dispatch: Dispatch) => {
  if (res.notFoundError) {
    res.results.forEach((result) => {
      if (result.notFound) {
        toast.error(
          `Unable to create stream ${result.name}. Please check your access permissions. Any other properties created were successful.`,
          {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss(),
            },
          }
        );
      }
    });

    dispatch(setErrorDetails(res.results));
    dispatch(setNotFoundError(true));
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
  }

  if (res.errors) {
    res.errors.forEach((error) => {
      toast.error(`Unable to create feature. ${error}`, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    });
  }
};