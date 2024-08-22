import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { setCount } from '@/redux/formSlice';
import { FormCreateAmountSchema, FormsSchema } from '@/src/lib/schemas/ga/properties';
import { RootState } from '@/src/redux/store';
import { GA4PropertyType } from '@/src/types/types';

export const useFormInitialization = (formDataDefaults: GA4PropertyType) => {
    const dispatch = useDispatch();
    const propertyCount = useSelector((state: RootState) => state.form.count);

    const formCreateAmount = useForm({
        resolver: zodResolver(FormCreateAmountSchema),
        defaultValues: { amount: 1 },
    });

    const form = useForm({
        defaultValues: { forms: [formDataDefaults] },
        resolver: zodResolver(FormsSchema),
    });

    const { fields, append } = useFieldArray({
        control: form.control,
        name: 'forms',
    });

    useEffect(() => {
        const amountValue = formCreateAmount.watch('amount');
        const amount = parseInt(amountValue?.toString() || '0');
        dispatch(setCount(amount));
    }, [formCreateAmount, dispatch]);

    const addForm = () => {
        append(formDataDefaults);
    };

    return { formCreateAmount, form, fields, addForm, propertyCount };
};