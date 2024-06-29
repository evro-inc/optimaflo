'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, incrementStep, decrementStep, setCount } from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    FormCreateAmountSchema,
    FormSchema,
    FormValuesType,
    UserPermissionSchema,
    UserPermissionType,
} from '@/src/lib/schemas/gtm/userPermissions';
import { Button } from '@/src/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/src/components/ui/form';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/src/components/ui/select';

import { Input } from '@/src/components/ui/input';
import {
    AccountPermission,
    ContainerPermission,
    FeatureResponse,
    FormCreateProps,
    UserPermission,
} from '@/src/types/types';
import { toast } from 'sonner';
import {
    selectTable,
    setErrorDetails,
    setIsLimitReached,
    setNotFoundError,
} from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CreatePermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';
import {
    accountAccessPermissions,
    containerAccessPermissions,
} from '../../../entities/@permissions/items';
import EmailAddressField from '../components/email';
import EntitySelection from '../components/entitySelection';
import { ContainerPermissions } from '../components/containerPermissions';
import Email from '../components/email';

const NotFoundErrorModal = dynamic(
    () =>
        import('../../../../../../../components/client/modals/notFoundError').then(
            (mod) => mod.NotFoundError
        ),
    { ssr: false }
);

const ErrorModal = dynamic(
    () =>
        import('../../../../../../../components/client/modals/Error').then((mod) => mod.ErrorMessage),
    { ssr: false }
);

const defaultUserPermission: UserPermissionType = {
    accountId: '',
    emailAddress: '',
    accountAccess: { permission: AccountPermission.UNSPECIFIED },
    containerAccess: [{ containerId: '', permission: ContainerPermission.UNSPECIFIED }],
};

const FormCreatePermission: React.FC<FormCreateProps> = ({
    tierLimits,
    accounts = [],
    containers = [],
    table = [],
}) => {
    const dispatch = useDispatch();
    const loading = useSelector((state: RootState) => state.form.loading);
    const error = useSelector((state: RootState) => state.form.error);
    const currentStep = useSelector((state: RootState) => state.form.currentStep);
    const propertyCount = useSelector((state: RootState) => state.form.count);
    const notFoundError = useSelector(selectTable).notFoundError;
    const router = useRouter();
    const count = useSelector((state: RootState) => state.form.count);

    const foundTierLimit = tierLimits.find(
        (subscription) => subscription.Feature?.name === 'GTMPermissions'
    );

    const createLimit = foundTierLimit?.createLimit;
    const createUsage = foundTierLimit?.createUsage;
    const remainingCreate = createLimit - createUsage;

    const formCreateAmount = useForm({
        resolver: zodResolver(FormCreateAmountSchema),
        defaultValues: {
            amount: 1,
        },
    });

    const form = useForm<FormValuesType>({
        defaultValues: {
            forms: [{
                emailAddresses: [{ emailAddress: '' }],
                permissions: [defaultUserPermission],
            }]
        },
        resolver: zodResolver(FormSchema),
    });

    const {
        fields: formFields,
        append: appendForm,
        remove: removeForm,
    } = useFieldArray({
        control: form.control,
        name: 'forms',
    });


    // Effect to update propertyCount when amount changes
    useEffect(() => {
        const amount = parseInt(formCreateAmount.getValues('amount').toString());
        dispatch(setCount(amount));
    }, [formCreateAmount.watch('amount'), dispatch]);



    if (notFoundError) {
        return <NotFoundErrorModal />;
    }
    if (error) {
        return <ErrorModal />;
    }

    const handleAmountChange = (selectedAmount) => {
        // Convert the selected amount to a number
        const amount = parseInt(selectedAmount);

        // First, reset the current forms to start fresh
        // Note: This step might need adjustment based on your exact requirements
        // and the behavior you observe with your form state management
        form.reset({ forms: [] }); // Clear existing forms

        // Then, append new forms based on the selected amount
        for (let i = 0; i < amount; i++) {
            appendForm({
                emailAddresses: [{ emailAddress: '' }],
                permissions: [JSON.parse(JSON.stringify(defaultUserPermission))], // Deep copy
            });
        }

        // Update the container count in your state management (if necessary)
        dispatch(setCount(amount));
    };

    const processForm: SubmitHandler<FormValuesType> = async (data) => {
        dispatch(setLoading(true));

        console.log('data', data);

        toast('Creating permissions...', {
            action: { label: 'Close', onClick: () => toast.dismiss() },
        });

        const uniquePermissions = new Set();
        data.forms.forEach((formSet) => {
            formSet.permissions.forEach((permission) => {
                formSet.emailAddresses.forEach((email) => {
                    const identifier = `${permission.accountId}-${permission.accountAccess.permission}-${email.emailAddress}`;
                    permission.containerAccess.forEach((container) => {
                        const containerIdentifier = `${identifier}-${container.containerId}-${container.permission}`;
                        if (uniquePermissions.has(containerIdentifier)) {
                            toast.error(
                                `Duplicate property found for ${permission.accountId} - ${permission.accountAccess.permission} - ${email.emailAddress}`,
                                {
                                    action: { label: 'Close', onClick: () => toast.dismiss() },
                                }
                            );
                            dispatch(setLoading(false));
                            return;
                        }
                        uniquePermissions.add(containerIdentifier);
                    });
                });
            });
        });

        const generatedPermissions = data.forms.flatMap((formSet) => {
            return formSet.emailAddresses.flatMap((email) => {
                return formSet.permissions.map((permission) => ({
                    ...permission,
                    emailAddress: email.emailAddress,
                }));
            });
        });


        try {
            const res = (await CreatePermissions({
                emailAddresses: data.forms.flatMap(formSet => formSet.emailAddresses),
                permissions: generatedPermissions,
            })) as FeatureResponse;

            if (res.success) {
                res.results.forEach((result) => {
                    if (result.success) {
                        toast.success(
                            `Permission ${result.name} created successfully. The table will update shortly.`,
                            {
                                action: { label: 'Close', onClick: () => toast.dismiss() },
                            }
                        );
                    }
                });
                router.push('/dashboard/gtm/entities');
            } else {
                handleErrors(res);
            }

            form.reset({ forms: [{ permissions: [defaultUserPermission], emailAddresses: [{ emailAddress: '' }] }] });
        } catch (error) {
            toast.error('An unexpected error occurred.', {
                action: { label: 'Close', onClick: () => toast.dismiss() },
            });
        } finally {
            dispatch(setLoading(false));
        }
    };

    const handleErrors = (res: FeatureResponse) => {
        if (res.notFoundError) {
            res.results.forEach((result) => {
                if (result.notFound) {
                    toast.error(
                        `Unable to create permission ${result.name}. Please check your access permissions. Any other properties created were successful.`,
                        {
                            action: { label: 'Close', onClick: () => toast.dismiss() },
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
                        `Unable to create permission ${result.name}. You have ${result.remaining} more permission(s) you can create.`,
                        {
                            action: { label: 'Close', onClick: () => toast.dismiss() },
                        }
                    );
                }
            });
            dispatch(setIsLimitReached(true));
        }

        if (res.errors) {
            res.errors.forEach((error) => {
                toast.error(`Unable to create permission. ${error}`, {
                    action: { label: 'Close', onClick: () => toast.dismiss() },
                });
            });
            router.push('/dashboard/gtm/entities');
        }
    };


    /// Needs IDS after permssions/emailAddresses
    const handleNext = async () => {
        const currentFormIndex = currentStep - 2;
        const currentFormPermissions = `forms.${currentFormIndex}`;


        const fieldsToValidate = [
            `${currentFormPermissions}.emailAddresses`,
            `${currentFormPermissions}.permissions`,
        ];

        const isFormValid = await form.trigger(fieldsToValidate as any);

        if (isFormValid) {
            dispatch(incrementStep());
        }
    };

    const handlePrevious = () => {
        dispatch(decrementStep());
    };

    console.log('form errors:', form.formState.errors);




    return (
        <div className="flex items-center justify-center h-screen">
            {/* Conditional rendering based on the currentStep */}
            {currentStep === 1 && (
                <Form {...formCreateAmount}>
                    <form className="w-2/3 space-y-6">
                        <FormField
                            control={formCreateAmount.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>How many permissions do you want to create?</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            handleAmountChange(value);
                                        }}
                                        defaultValue={propertyCount.toString()}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select the amount of properties you want to create." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Array.from({ length: remainingCreate }, (_, i) => (
                                                <SelectItem key={i} value={`${i + 1}`}>
                                                    {i + 1}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <Button type="button" onClick={handleNext}>
                            Next
                        </Button>
                    </form>
                </Form>
            )}

            {currentStep > 1 && (
                <div className="w-full">
                    {formFields.length >= currentStep - 1 && (
                        <div
                            key={formFields[currentStep - 2].id}
                            className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                        >
                            <div className="max-w-xl mx-auto">
                                <div className="mt-12">
                                    <Form {...form}>
                                        <form
                                            onSubmit={form.handleSubmit(processForm)}
                                            id="createPermission"
                                            className="space-y-6"
                                        >




                                            <div key={formFields[currentStep - 2].id} className="space-y-4">
                                                <h3>Permission {currentStep - 1}</h3>
                                                <EmailAddressField formIndex={currentStep - 2} control={form.control} register={form.register} getValues={form.getValues} setValue={form.setValue} />
                                                <EntitySelection
                                                    accountsWithContainers={table}
                                                    containers={containers}
                                                    formIndex={currentStep - 2}
                                                />
                                            </div>

                                            <div className="flex justify-between">
                                                <Button type="button" onClick={handlePrevious}>
                                                    Previous
                                                </Button>
                                                {currentStep - 1 < count ? (
                                                    <Button type="button" onClick={handleNext}>
                                                        Next
                                                    </Button>
                                                ) : (
                                                    <Button type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
                                                )}
                                            </div>
                                        </form>
                                    </Form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FormCreatePermission;
