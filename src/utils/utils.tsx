import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Dispatch } from 'redux';
import { SubmitHandler, useFormContext } from 'react-hook-form';
import { setCount, setLoading } from '@/redux/formSlice';
import { FeatureResponse, FormWithParent, TierLimit } from '../types/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { setErrorDetails, setIsLimitReached, setNotFoundError } from '../redux/tableSlice';

export interface Feature {
  name: string;
}

export type LimitType = 'create' | 'update';

/**
 * Calculate the remaining limit for a specific feature and operation type (create/update).
 *
 * @param tierLimits - Array of Subscription objects.
 * @param featureName - Name of the feature to find the tier limit for.
 * @param limitType - Type of limit to calculate ('create' or 'update').
 * @returns An object containing the limit, usage, and remaining limit for the specified type.
 */

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

// Make processForm generic to accept different types of forms
/* export const processForm = async <TFormValues extends FormWithParent>(
  apiCall: (data: { forms: TFormValues[] }) => Promise<FeatureResponse>,
  data: TFormValues[],  // Use submitted data
  resetForm: () => void,
  dispatch: Dispatch,
  router: ReturnType<typeof useRouter>,
  redirectPath: string
): Promise<FeatureResponse> => {
  try {
    dispatch(setLoading(true));
    const res = await apiCall({ forms: data });  // Pass the actual form data

    console.log('api call', res);


    if (res.success) {
      toast.success('Request successful!');
      resetForm();
      router.push(redirectPath);
    } else {
      handleErrors(res, dispatch);
    }

    return res;  // Return the API response
  } catch (error) {
    toast.error('An unexpected error occurred.');
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};
 */

/* export const processForm = <TFormValues extends FormWithParent>(
  apiCall: (data: { forms: TFormValues[] }) => Promise<FeatureResponse>,
  formDataDefaults: TFormValues[],
  resetForm: () => void,
  dispatch: Dispatch,
  router: ReturnType<typeof useRouter>,
  redirectPath: string
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

      console.log('res 56', res);


      if (res.success) {
        router.push(redirectPath);
        resetForm();
      } else {
        handleErrors(res, dispatch);
      }

      return res;  // Ensure that the API response is returned here
    } catch (error) {
      toast.error('An unexpected error occurred.');
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
};
 */

export const processForm = <TFormValues extends FormWithParent>(
  apiCall: (data: { forms: TFormValues[] }) => Promise<FeatureResponse>,
  formDataDefaults: TFormValues[], // Accepting an array of defaults
  resetForm: () => void,
  dispatch: Dispatch,
  router: ReturnType<typeof useRouter>,
  redirectPath: string
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
      console.log('form', form);
      let identifier;

      identifier = `${form.parent ?? 'unknown-parent'} - ${form.name ?? 'unknown-name'} - ${
        form.displayName ?? 'unknown-displayName'
      } - ${
        Array.isArray(form.accountContainerWorkspace)
          ? form.accountContainerWorkspace
              .map(
                (workspace) =>
                  `Account: ${workspace.accountId}, Container: ${workspace.containerId}, Workspace: ${workspace.workspaceId}`
              )
              .join(' | ')
          : 'unknown-account-container-workspace'
      } - Types: ${Array.isArray(form.type) ? form.type.join(', ') : 'unknown-type'}`;

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

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Execution of ${result.name} is successful. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });

        router.push(redirectPath);
      } else {
        handleErrors(res, dispatch);
      }

      resetForm();
    } catch (error) {
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
          `Unable to execute ${result.name}. Please check your access permissions. Any other properties created were successful.`,
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

export const calculateRemainingLimit = (
  tierLimits: TierLimit[],
  featureName: string,
  limitType: LimitType = 'create'
) => {
  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === featureName
  );

  if (!foundTierLimit) {
    return {
      limit: 0,
      usage: 0,
      remaining: 0,
    };
  }

  const limit = foundTierLimit[`${limitType}Limit`] || 0;
  const usage = foundTierLimit[`${limitType}Usage`] || 0;
  const remaining = limit - usage;

  return {
    limit,
    usage,
    remaining,
  };
};
