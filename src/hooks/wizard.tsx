import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { decrementStep, incrementStep, setCount } from '@/redux/formSlice';
import { FormCreateAmountSchema } from '@/src/lib/schemas/ga/properties';
import { RootState } from '@/src/redux/store';
import dynamic from 'next/dynamic';
import { z, ZodSchema } from 'zod';

const NotFoundErrorModal = dynamic(
    () => import('../components/client/modals/notFoundError').then((mod) => mod.NotFoundError),
    { ssr: false }
);

const ErrorModal = dynamic(
    () => import('../components/client/modals/Error').then((mod) => mod.ErrorMessage),
    { ssr: false }
);

type UseStepNavigationParams = {
    form: UseFormReturn<any>;
    currentStep: number;
    fieldsToValidate: string[];
};

export const useFormInitialization = <T extends Record<string, any>>(
    formDataDefaults: T[], // Generic type for formDataDefaults
    FormsSchema: ZodSchema
) => {
    const dispatch = useDispatch();
    const count = useSelector((state: RootState) => state.form.count);

    // Infer the form type dynamically based on the provided schema
    type Forms = z.infer<typeof FormsSchema>;

    const formAmount = useForm({
        resolver: zodResolver(FormCreateAmountSchema),
        defaultValues: { amount: 1 },
    });

    // Initialize the form with multiple defaults
    const form = useForm<Forms>({
        defaultValues: { forms: formDataDefaults }, // Use the array directly
        resolver: zodResolver(FormsSchema), // Use the passed schema for validation
        mode: 'onChange',  // Trigger validation on change
    });

    const { fields, append } = useFieldArray({
        control: form.control,
        name: 'forms',
    });

    useEffect(() => {
        const amountValue = formAmount.watch('amount');
        const amount = parseInt(amountValue?.toString() || '0');
        dispatch(setCount(amount));
    }, [formAmount, dispatch]);

    const addForm = () => {
        append(formDataDefaults[0]); // Append a single default form (or modify as needed)
    };

    return { formAmount, form, fields, addForm, count };
};

export const useStepNavigation = ({
    form,
    currentStep,
    fieldsToValidate,
}: UseStepNavigationParams) => {
    const dispatch = useDispatch();

    const handleNext = async () => {
        const currentFormIndex = currentStep - 2; // Adjusting for the array index and step count
        const currentFormPath = `forms.${currentFormIndex}`;

        const fields = fieldsToValidate.map((field) => `${currentFormPath}.${field}`);

        const isFormValid = await form.trigger(fields as any);

        if (isFormValid) {
            dispatch(incrementStep());
        }
    };

    const handlePrevious = () => {
        dispatch(decrementStep());
    };

    return { handleNext, handlePrevious };
};

export const useErrorHandling = (error, notFoundError) => {
    return useMemo(() => {
        if (error) return <ErrorModal />;
        if (notFoundError) return <NotFoundErrorModal onClose={undefined} />;
        return null;
    }, [error, notFoundError]);
};

export const useAccountsWithProperties = (accounts, properties) => {
    console.log("Accounts input:", accounts);
    console.log("Properties input:", properties);

    return useMemo(() => {
        // Directly use properties array since it is already flat
        const allProperties = properties;

        // Map accounts and attach properties that belong to each account
        const mappedAccounts = accounts
            .map((account) => ({
                ...account,
                properties: allProperties.filter((property) => property.parent === account.name),
            }))
            .filter((account) => account.properties.length > 0); // Filter out accounts with no properties

        console.log("mappedAccounts", mappedAccounts);

        return mappedAccounts;
    }, [accounts, properties]);
};


export function useErrorRedirect(selectedRowData: any, router: any, redirectPath: string) {
    useEffect(() => {
        if (Object.keys(selectedRowData).length === 0) {
            router.push(redirectPath);
        }
    }, [selectedRowData, router, redirectPath]);
}
