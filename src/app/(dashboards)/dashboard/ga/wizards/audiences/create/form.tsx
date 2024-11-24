'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLoading,
  incrementStep,
  decrementStep,
  setCount,
  setShowSimpleForm,
  removeSimpleForm,
  FormIdentifier,
  setShowCard,
  removeCard,
  removeOrForm,
  setShowSequenceForm,
  removeSequenceForm,
  removeStep,
  CardIdentifier,
  setShowStep,
  StepIdentifier,
} from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AudienceExclusionDurationMode,
  FormCreateAmountSchema,
  FormsSchema,
} from '@/src/lib/schemas/ga/audiences';
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
import { AudienceType, FeatureResponse, FormCreateProps } from '@/src/types/types';
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
import { createGAAudiences } from '@/src/lib/fetch/dashboard/actions/ga/audiences';
import { Card, CardContent, CardFooter, CardHeader } from '@/src/components/ui/card';

import { Checkbox } from '@/src/components/ui/checkbox';
import {
  ImmediatelyFollows,
  SequenceScope,
  SimpleScope,
} from '../../../properties/@audiences/items';
import {
  PlusIcon,
  BarChartIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
  TrashIcon,
  CircleIcon,
  ClockIcon,
  ValueNoneIcon,
} from '@radix-ui/react-icons';
import { Dialog, DialogContent, DialogTrigger } from '@/src/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/src/components/ui/accordion';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { UserPlusIcon } from '@heroicons/react/24/solid';
import {
  setExcludeSequenceForm,
  setExcludeSimpleForm,
  setShowExcludeCard,
  setExcludeParentForm,
  removeExcludeSequenceForm,
  removeExcludeSimpleForm,
  removeExcludeParentForm,
  removeExcludeCard,
  removeExcludeStep,
  setShowExcludeStep,
} from '@/src/redux/excludeFormSlice';

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

type Forms = z.infer<typeof FormsSchema>;

const FormCreateAudience: React.FC<FormCreateProps> = ({
  tierLimits,
  properties = [],
  table = [],
  accounts = [],
  dimensions = [],
  metrics = [],
}) => {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.form.loading);
  const error = useSelector((state: RootState) => state.form.error);
  const currentStep = useSelector((state: RootState) => state.form.currentStep);
  const count = useSelector((state: RootState) => state.form.count);
  const notFoundError = useSelector(selectTable).notFoundError;
  const router = useRouter();

  // Form state
  const simpleFormsToShow = useSelector((state: RootState) => state.form.showSimpleForm);
  const sequenceFormsToShow = useSelector((state: RootState) => state.form.showSequenceForm);
  const cardsToShow = useSelector((state: RootState) => state.form.showCard);
  const orForms = useSelector((state: RootState) => state.form.showCard);
  const showStep = useSelector((state: RootState) => state.form.showStep);

  // Exclude Form state
  const showExcludeParent = useSelector((state: RootState) => state.excludeForm.showParentForm);
  const excludeSimpleFormsToShow = useSelector(
    (state: RootState) => state.excludeForm.showSimpleForm
  );
  const excludeSequenceFormsToShow = useSelector(
    (state: any) => state.excludeForm.showSequenceForm
  );
  const excludeCardsToShow = useSelector((state: RootState) => state.excludeForm.showCard);
  const excludeShowStep = useSelector((state: RootState) => state.excludeForm.showStep);

  const categorizedDimensions = dimensions.reduce((acc, item) => {
    const categoryIndex = acc.findIndex((cat) => cat.name === item.category);
    if (categoryIndex > -1) {
      const isUnique = !acc[categoryIndex].items.some(
        (existingItem) => existingItem.apiName === item.apiName
      );
      if (isUnique) {
        acc[categoryIndex].items.push(item);
      }
    } else {
      acc.push({ name: item.category, items: [item] });
    }
    return acc;
  }, []);

  const categorizedMetrics = metrics.reduce((acc, item) => {
    const categoryIndex = acc.findIndex((cat) => cat.name === item.category);
    if (categoryIndex > -1) {
      const isUnique = !acc[categoryIndex].items.some(
        (existingItem) => existingItem.apiName === item.apiName
      );
      if (isUnique) {
        acc[categoryIndex].items.push(item);
      }
    } else {
      acc.push({ name: item.category, items: [item] });
    }
    return acc;
  }, []);

  const combinedCategories = [
    {
      name: 'Dimensions',
      categories: categorizedDimensions,
    },
    {
      name: 'Metrics',
      categories: categorizedMetrics,
    },
  ];

  const extractedData = table.map((item) => {
    const propertyId = item.name.split('/')[1];
    const property = item.property;
    const accountId = item.accountId.split('/')[1];
    const accountName = item.accountName;
    const ids = 'accountId/' + accountId + '/' + 'propertyId/' + propertyId;
    const names = 'account/' + accountName + '/' + 'property/' + property;

    return {
      ids,
      names,
    };
  });

  const cleanedData = extractedData.map((item) => ({
    id: item.ids,
    label: item.names
      .replace(/\/property\//g, ' - Property: ')
      .replace(/account\//g, '')
      .replace(/\/propertyId\//g, ' - Property ID: ')
      .replace(/accountId\//g, 'Account ID: '),
  }));

  const uniqueData = cleanedData.reduce((acc, current) => {
    const x = acc.find((item) => item.id === current.id && item.label === current.label);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4Audiences'
  );

  const createLimit = foundTierLimit?.createLimit;
  const createUsage = foundTierLimit?.createUsage;
  const remainingCreate = createLimit - createUsage;

  const accountsWithProperties = accounts
    .map((account) => {
      const accountProperties = properties.filter((property) => property.parent === account.name);

      return {
        ...account,
        properties: accountProperties,
      };
    })
    .filter((account) => account.properties.length > 0);

  const formDataDefaults: AudienceType = {
    account: accountsWithProperties[0].name,
    property: accountsWithProperties[0].properties[0].name,
    displayName: '',
    name: '',
    membershipDurationDays: 30,
    adsPersonalizationEnabled: false,
    description: '',
    exclusionDurationMode: AudienceExclusionDurationMode.EXCLUDE_PERMANENTLY,
    filterClauses: [],
  };

  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormsSchema),
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'forms',
  });

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  // Effect to update count when amount changes
  useEffect(() => {
    const amountValue = formCreateAmount.watch('amount'); // Extract the watched value
    const amount = parseInt(amountValue?.toString() || '0'); // Handle cases where amountValue might be undefined or null
    dispatch(setCount(amount));
  }, [formCreateAmount, dispatch]); // Include formCreateAmount and dispatch as dependencies

  if (notFoundError) {
    return <NotFoundErrorModal onClose={undefined} />;
  }
  if (error) {
    return <ErrorModal />;
  }

  const addForm = () => {
    append(formDataDefaults);
  };

  const currentFormIndex = currentStep - 2;

  const handleAmountChange = (selectedAmount) => {
    const amount = parseInt(selectedAmount);

    form.reset({ forms: [] }); // Clear existing forms

    for (let i = 0; i < amount; i++) {
      addForm(); // Use your existing addForm function that calls append
    }

    dispatch(setCount(amount));
  };

  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true));

    toast('Creating conversion events...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const uniqueConversionEvents = new Set(forms.map((form) => form.property));
    for (const form of forms) {
      const identifier = `${form.property}-${form.displayName}`;
      if (uniqueConversionEvents.has(identifier)) {
        toast.error(`Duplicate conversion event found for ${form.property} - ${form.displayName}`, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
        dispatch(setLoading(false));
        return;
      }
      uniqueConversionEvents.add(identifier);
    }

    try {
      const res = (await createGAAudiences({ forms })) as FeatureResponse;

      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Custom metric ${result.name} created successfully. The table will update shortly.`,
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
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create conversion event ${result.name}. Please check your access permissions. Any other conversion events created were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });

          dispatch(setErrorDetails(res.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
        }

        if (res.limitReached) {
          res.results.forEach((result) => {
            if (result.limitReached) {
              toast.error(
                `Unable to create conversion event ${result.name}. You have ${result.remaining} more conversion event(s) you can create.`,
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
            toast.error(`Unable to create conversion event. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
          router.push('/dashboard/ga/properties');
        }
        form.reset({
          forms: [formDataDefaults],
        });
      }

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [formDataDefaults],
      });
    } catch (error) {
      toast.error('An unexpected error occurred.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
      return { success: false };
    } finally {
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleNext = async () => {
    const currentFormPath = `forms.${currentFormIndex}`;

    // Start with the common fields that are always present
    const fieldsToValidate = [
      `${currentFormPath}.account`,
      `${currentFormPath}.property`,
      `${currentFormPath}.displayName`,
      `${currentFormPath}.membershipDurationDays`,
      `${currentFormPath}.adsPersonalizationEnabled`,
      `${currentFormPath}.description`,
      `${currentFormPath}.exclusionDurationMode`,
      `${currentFormPath}.filterClauses`,
    ];

    // Now, trigger validation for these fields
    const isFormValid = await form.trigger(fieldsToValidate as any);

    if (isFormValid) {
      dispatch(incrementStep());
    }
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  const handleShowForm = (formType: string) => {
    const newFormGroupId = crypto.randomUUID();
    const newCardFormId = crypto.randomUUID();
    const parentId = crypto.randomUUID();

    const newForm: FormIdentifier = {
      id: newFormGroupId,
      type: formType,
      cards: [
        {
          id: newCardFormId,
          type: 'card',
          parentId: newFormGroupId,
        },
      ],
      parentId,
      steps: [
        {
          id: crypto.randomUUID(),
          type: 'step',
          parentId: newFormGroupId,
          cards: [
            {
              id: crypto.randomUUID(),
              type: 'card',
              parentId: newFormGroupId,
            },
          ],
        },
      ],
    };

    if (formType == 'simple') {
      // If there's no parent, this is a top-level form group
      dispatch(setShowSimpleForm([...simpleFormsToShow, newForm]));
      handleCard(newFormGroupId, 'card');
    }
    if (formType == 'sequence') {
      dispatch(setShowSequenceForm([...sequenceFormsToShow, newForm]));
      //handleCard(newFormGroupId, 'card');
      handleShowStep(newFormGroupId, 'step');
    }
    if (formType == 'excludeSimple') {
      // If there's no parent, this is a top-level form group
      dispatch(setExcludeSimpleForm([...excludeSimpleFormsToShow, newForm]));
      handleCard(newFormGroupId, 'excludeCard');
    }
    if (formType == 'excludeSequence') {
      dispatch(setExcludeSequenceForm([...excludeSequenceFormsToShow, newForm]));
      handleCard(newFormGroupId, 'excludeCard');
      handleShowStep(newFormGroupId, 'excludeStep');
    }
    if (formType == 'excludeShowParent') {
      dispatch(setExcludeParentForm([...showExcludeParent, newForm]));
      dispatch(setExcludeSimpleForm([...excludeSimpleFormsToShow, newForm]));
      handleCard(newFormGroupId, 'excludeCard');
    }
  };

  const handleRemoveSimpleForm = (formId: string, type: 'include' | 'exclude') => {
    if (type === 'exclude') {
      dispatch(removeExcludeSimpleForm(formId));
      // Check if this was the last excludeSimpleForm and there are no excludeSequenceForms
      if (excludeSimpleFormsToShow.length === 1 && excludeSequenceFormsToShow.length === 0) {
        // Dispatch removal of the parent form
        dispatch(removeExcludeParentForm(showExcludeParent[showExcludeParent.length - 1].id)); // Use actual parentId
      }
    } else if (type === 'include') {
      // Handle include case
      dispatch(removeSimpleForm(formId));
    }
  };

  const handleRemoveSequenceForm = (formId: string, type: 'include' | 'exclude') => {
    if (type === 'exclude') {
      // Check if this was the last excludeSequenceForm and there are no excludeSimpleForms
      if (excludeSequenceFormsToShow.length === 1 && excludeSimpleFormsToShow.length === 0) {
        // Dispatch removal of the parent form
        dispatch(removeExcludeParentForm(showExcludeParent[showExcludeParent.length - 1].id)); // Use actual parentId
      }
      dispatch(removeExcludeSequenceForm(formId));
    } else if (type === 'include') {
      // Handle include case
      dispatch(removeSequenceForm(formId));
      dispatch(removeStep(formId));
      dispatch(removeCard(formId));
    }
  };

  const handleCard = (parentId: string, cardType: string) => {
    const uniqueId = `card-${crypto.randomUUID()}`;
    const newCard: CardIdentifier = {
      id: uniqueId,
      type: cardType, // Make sure this is adjusted based on the context (e.g., 'card', 'excludeCard')
      parentId,
    };

    if (cardType === 'card' || cardType === 'or') {
      dispatch(setShowCard([...cardsToShow, newCard]));
    }
    if (cardType === 'excludeCard') {
      dispatch(setShowExcludeCard([...excludeCardsToShow, newCard]));
    }
  };

  // A helper function to remove a card and update its parent form if necessary.
  const removeCardAndUpdateParent = (cards, cardId, removeCardAction, removeParentFormActions) => {
    dispatch(removeCardAction(cardId)); // Dispatch the action to remove the card.

    const parentFormId = cards.find((card) => card.id === cardId)?.parentId;
    if (!parentFormId) return; // Early exit if no parent ID is found.

    // Check if there are any remaining cards in this parent form.
    const remainingCards = cards.filter(
      (card) => card.parentId === parentFormId && card.id !== cardId
    );
    if (remainingCards.length === 0) {
      // If no remaining cards, remove the parent form.
      removeParentFormActions.forEach((action) => dispatch(action(parentFormId)));
    }
  };

  // Refactored handleRemoveCard using the helper function.
  const handleRemoveCard = (cardId) => {
    // Handling for include cards and parent forms.
    removeCardAndUpdateParent(cardsToShow, cardId, removeCard, [
      removeSimpleForm,
      removeSequenceForm,
    ]);

    // Handling for exclude cards and parent forms.
    removeCardAndUpdateParent(excludeCardsToShow, cardId, removeExcludeCard, [
      removeExcludeSimpleForm,
      removeExcludeSequenceForm,
    ]);
  };

  const handleShowStep = (parentId: string, stepType: string) => {
    const stepId = `step-${crypto.randomUUID()}`;
    const cardId = `card-${crypto.randomUUID()}`;

    const newForm: StepIdentifier = {
      id: stepId,
      type: stepType,
      parentId,
      cards: [
        {
          id: cardId,
          type: 'card',
          parentId: stepId,
        },
      ],
    };

    if (stepType == 'step') {
      dispatch(setShowStep([...showStep, newForm]));
      handleCard(stepId, 'card');
    }
    if (stepType == 'excludeStep') {
      dispatch(setShowExcludeStep([...excludeShowStep, newForm]));
      handleCard(stepId, 'excludeCard');
    }
  };

  const handleRemoveStep = (stepId: string, type: 'include' | 'exclude') => {
    // Determine the parent ID of the step being removed
    const stepToRemove = (type === 'include' ? showStep : excludeShowStep).find(
      (step) => step.id === stepId
    );
    const parentId = stepToRemove?.parentId;

    if (!parentId) {
      throw new Error('Parent ID not found for step');
    }

    // Filter to get the steps that belong to the same parent
    const stepsOfSameParent = (type === 'include' ? showStep : excludeShowStep).filter(
      (step) => step.parentId === parentId
    );

    // If it's the last step in the sequence, remove the sequence form as well
    if (stepsOfSameParent.length <= 1) {
      if (type === 'include') {
        dispatch(removeSequenceForm(parentId));
      } else if (type === 'exclude') {
        dispatch(removeExcludeSequenceForm(parentId));
      }
    }

    // Proceed to remove the step
    if (type === 'include') {
      dispatch(removeStep(stepId));
    } else if (type === 'exclude') {
      dispatch(removeExcludeStep(stepId));
    }
  };

  const handleRemoveOrForm = (formId) => {
    dispatch(removeOrForm(formId));
  };

  const ConditionalForm = () => {
    //Using local useState instead of redux because of re-rendering issues
    const [selectedCategoryItems, setSelectedCategoryItems] = useState([]);

    // This function is called when an item in the first Select is selected
    const handleCategorySelection = (selectedCategoryName) => {
      // Find the category and its items based on the selected name
      const selectedCategory = combinedCategories
        .flatMap((category) => category.categories)
        .find((category) => category.name === selectedCategoryName);

      // Update the state to reflect the items of the selected category
      setSelectedCategoryItems(selectedCategory ? selectedCategory.items : []);
    };

    return (
      <div className="flex space-x-4">
        <Select onValueChange={handleCategorySelection}>
          <SelectTrigger>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {/* {combinedCategories.flatMap(parentCategory => parentCategory.categories).map((category) => (
              <SelectItem value={category.name}>{category.name}</SelectItem>
            ))} */}
            {combinedCategories.map((parentCategory) => (
              <SelectGroup key={parentCategory.name}>
                <SelectLabel>{parentCategory.name}</SelectLabel>
                {parentCategory.categories.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {/* Second Select that displays items based on the selected category */}
        <Select disabled={selectedCategoryItems.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder="Select Item" />
          </SelectTrigger>
          <SelectContent>
            {selectedCategoryItems.map((item: any) => (
              <SelectItem key={item.apiName} value={item.apiName}>
                {item.uiName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/*   <Dialog>
          <DialogTrigger asChild>
            <Button className="flex justify-between items-center w-full" variant="ghost">
              Add new condition
              <ChevronDownIcon className="text-gray-400" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl mx-auto bg-white shadow rounded-lg h-96">
            <div className="flex">
              <div className="flex flex-col w-64 mr-4">
                <div className="flex items-center px-3 py-2 space-x-2 border-b">
                  <MagnifyingGlassIcon className="text-gray-400" />
                  <Input placeholder="Search items" />
                </div>
                <Accordion type='single' collapsible className="mt-2">
                  {combinedCategories.map((parentCategory) => (
                    <AccordionItem key={parentCategory.name} value={parentCategory.name}>
                      <AccordionTrigger>{parentCategory.name}</AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col overflow-auto max-h-32">
                          {parentCategory.categories.map((category) => (
                            <Button
                              variant="ghost"
                              key={category.name}
                              onClick={(event) => handleCategoryClick(category.items, event)}
                              className="mb-2 justify-start w-full text-left"
                            >
                              <h3>{category.name}</h3>
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
              <div className="flex-1 overflow-auto max-h-80">
                <ScrollArea className="">
                  <ul>
                    {localSelectedItems.map((item: any) => (
                      <li key={item.id} className="px-3 py-2">
                        <Button variant="ghost">
                          {item.uiName}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>

              </div>
            </div>
          </DialogContent>
        </Dialog> */}
      </div>
    );
  };

  const TimeConstraint = () => {
    return (
      <>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="flex justify-between items-center w-full"
              size="icon"
              variant="ghost"
            >
              <ClockIcon className="text-gray-400" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl mx-auto bg-white shadow rounded-lg">
            <div className="flex">
              <div className="flex flex-col w-64 mr-4">
                <div className="flex items-center px-3 py-2 space-x-2 border-b">
                  <MagnifyingGlassIcon className="text-gray-400" />
                  <Input placeholder="Search items" />
                </div>
                <Accordion type="single" className="mt-2">
                  <AccordionItem value="events">
                    <AccordionTrigger>Events</AccordionTrigger>
                    <AccordionContent>
                      <ul className="divide-y cursor-pointer">
                        <li className="px-3 py-2">app_clear_data</li>
                        <li className="px-3 py-2">app_exception</li>
                        <li className="px-3 py-2">app_store_refund</li>
                        <li className="px-3 py-2">app_store_subscription_cancel</li>
                        <li className="px-3 py-2">app_store_subscription_convert</li>
                        <li className="px-3 py-2">app_store_subscription_renew</li>
                        <li className="px-3 py-2">app_update</li>
                        <li className="px-3 py-2">first_open</li>
                        <li className="px-3 py-2">in_app_purchase</li>
                        <li className="px-3 py-2">notification_dismiss</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="dimensions">
                    <AccordionTrigger>Dimensions</AccordionTrigger>
                    <AccordionContent>
                      <ul className="divide-y cursor-pointer">
                        <li className="px-3 py-2">User</li>
                        <li className="px-3 py-2">Session</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="metrics">
                    <AccordionTrigger>Metrics</AccordionTrigger>
                    <AccordionContent>
                      <ul className="divide-y cursor-pointer">
                        <li className="px-3 py-2">Revenue</li>
                        <li className="px-3 py-2">Engagement</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <div className="flex-1">
                <ScrollArea className="h-72">
                  <ul className="divide-y">
                    <li className="px-3 py-2">app_clear_data</li>
                    <li className="px-3 py-2 bg-blue-100">app_exception</li>
                    <li className="px-3 py-2">app_store_refund</li>
                    <li className="px-3 py-2">app_store_subscription_cancel</li>
                    <li className="px-3 py-2">app_store_subscription_convert</li>
                    <li className="px-3 py-2">app_store_subscription_renew</li>
                    <li className="px-3 py-2">app_update</li>
                    <li className="px-3 py-2">first_open</li>
                    <li className="px-3 py-2">in_app_purchase</li>
                    <li className="px-3 py-2">notification_dismiss</li>
                  </ul>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const CardForm = (form) => {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mt-5">
            <div className="flex flex-row md:space-x-4 w-full">
              <div className="w-full basis-11/12">
                <ConditionalForm formId={form.id} parentType={form.type} />
              </div>

              <div className="w-full basis-1/12">
                <Button
                  className="flex items-center space-x-2 text-blue-500"
                  variant="ghost"
                  onClick={() => handleCard(form.id, 'or')}
                >
                  Or
                </Button>
              </div>

              <div className="w-full basis-1/12">
                <Button variant="outline" size="icon" onClick={() => handleRemoveCard(form.id)}>
                  <Cross2Icon className="text-gray-400" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        {orForms
          .filter((or) => or.parentId === form.id)
          .map((orForm) => (
            <>
              <div className="relative border-t border-dashed my-4 flex justify-center">
                <div className="absolute -bottom-3 left-5">
                  <Badge variant="secondary">OR</Badge>
                </div>
              </div>
              <CardContent key={orForm.id}>
                <div className="flex items-center justify-between mt-5">
                  <div className="flex flex-row md:space-x-4 w-full">
                    <div className="w-full basis-3/12">
                      <ConditionalForm formId={form.id} parentType={form.type} />
                    </div>
                    <div className="w-full basis-7/12">
                      <ConditionalForm formId={form.id} parentType={form.type} />
                    </div>
                    <div className="w-full basis-1/12">
                      <Button
                        className="flex items-center space-x-2 text-blue-500"
                        variant="ghost"
                        onClick={() => handleCard(form.id, 'or')}
                      >
                        Or
                      </Button>
                    </div>

                    <div className="w-full basis-1/12">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveOrForm(orForm.id)}
                      >
                        <Cross2Icon className="text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ))}
      </Card>
    );
  };

  const simpleForm = () => {
    return (
      <>
        {simpleFormsToShow.map((form, index) => (
          <div key={form.id}>
            {index > 0 && (
              <div className="w-10 flex flex-col items-center justify-center space-y-2">
                <div className="h-5">
                  <Separator orientation="vertical" />
                </div>
                <Badge variant="secondary">AND</Badge>
                <div className="h-5">
                  <Separator orientation="vertical" />
                </div>
              </div>
            )}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <CircleIcon className="text-blue-500 mr-2" />
                  <span className="flex-grow text-sm font-medium">Include users when:</span>
                  <div className="flex items-center space-x-2">
                    <UserPlusIcon className="text-gray-600" />
                    <Select>
                      <SelectTrigger id="user-action">
                        <SelectValue placeholder="Condition scoping" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {SimpleScope.map((item) => (
                          <SelectItem key={item.label} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Separator orientation="vertical" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSimpleForm(form.id, 'include')}
                    >
                      <TrashIcon className="text-gray-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {cardsToShow
                  .filter((card) => card.parentId === form.id)
                  .map((card, index) => (
                    <div key={card.id}>
                      {index > 0 && (
                        <div className="w-10 flex flex-col items-center justify-center space-y-2">
                          <div className="h-5">
                            <Separator orientation="vertical" />
                          </div>
                          <Badge variant="secondary">AND</Badge>
                          <div className="h-5">
                            <Separator orientation="vertical" />
                          </div>
                        </div>
                      )}
                      {CardForm(card)}
                    </div>
                  ))}

                <div className="mt-5">
                  <Button
                    className="flex items-center space-x-2"
                    onClick={() => handleCard(form.id, 'card')}
                  >
                    <PlusIcon className="text-white" />
                    <span>And</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </>
    );
  };

  const sequenceForm = () => {
    return (
      <>
        {sequenceFormsToShow.map((form, index) => (
          <div key={form.id}>
            {index > 0 && (
              <div className="w-10 flex flex-col items-center justify-center space-y-2">
                <div className="h-5">
                  <Separator orientation="vertical" />
                </div>
                <Badge variant="secondary">AND</Badge>
                <div className="h-5">
                  <Separator orientation="vertical" />
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center w-full">
                  <div className="flex basis-5/12">
                    <CircleIcon className="text-blue-500 mr-2" />
                    <span className="flex text-sm font-medium">Include sequence:</span>
                  </div>

                  <div className="flex flex-grow basis-7/12 justify-end">
                    <div className="flex items-center space-x-2">
                      <UserPlusIcon className="text-gray-600" />
                      <Select>
                        <SelectTrigger id="user-action">
                          <SelectValue placeholder="Sequence scoping" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {SequenceScope.map((item) => (
                            <SelectItem key={item.label} value={item.id}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Separator orientation="vertical" />
                      {TimeConstraint()}
                      <Separator orientation="vertical" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSequenceForm(form.id, 'include')}
                      >
                        <TrashIcon className="text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-2 w-full pt-2">
                  <Separator />
                </div>
              </CardHeader>

              {showStep
                .filter((step) => step.parentId === form.id)
                .map((step, stepIndex) => (
                  <>
                    <CardContent key={step.id}>
                      {stepIndex >= 1 ? (
                        // Custom rendering for the first step
                        <div className="flex items-center w-full">
                          <div className="flex flex-grow basis-full justify-start bg-gray-300 rounded p-2">
                            <div className="flex items-center space-x-2">
                              <Select>
                                <SelectTrigger
                                  id="user-action"
                                  className="border-none outline-none focus:outline-none focus:ring-0 shadow-none"
                                >
                                  <SelectValue
                                    placeholder="followed by"
                                    className="border-none outline-none focus:outline-none focus:ring-0"
                                  />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  className="border-none outline-none focus:outline-none focus:ring-0"
                                >
                                  {ImmediatelyFollows.map((item) => (
                                    <SelectItem key={item.label} value={item.id}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Separator orientation="vertical" className="bg-gray-400" />
                              {TimeConstraint()}
                            </div>
                          </div>
                        </div>
                      ) : // This part of the ternary operator needs to render something or nothing for subsequent steps.
                      // If there's no specific content needed for subsequent steps, you can return null or omit this part.
                      null}

                      <div className="flex items-center w-full mt-5">
                        <div className="basis-3/12">
                          <p>Step {stepIndex + 1}</p>
                        </div>
                        <div className="flex flex-grow basis-9/12 justify-end">
                          <div className="flex items-center space-x-2">
                            <UserPlusIcon className="text-gray-600" />
                            <Select>
                              <SelectTrigger id="user-action">
                                <SelectValue placeholder="Step scoping" />
                              </SelectTrigger>
                              <SelectContent position="popper">
                                {SimpleScope.map((item) => (
                                  <SelectItem key={item.label} value={item.id}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Separator orientation="vertical" />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveStep(step.id, 'include')}
                            >
                              <TrashIcon className="text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {cardsToShow
                        .filter((card) => card.parentId === step.id)
                        .map((card, index) => (
                          <div key={card.id}>
                            {index > 0 && (
                              <div className="w-10 flex flex-col items-center justify-center space-y-2">
                                <div className="h-5">
                                  <Separator orientation="vertical" />
                                </div>
                                <Badge variant="secondary">AND</Badge>
                                <div className="h-5">
                                  <Separator orientation="vertical" />
                                </div>
                              </div>
                            )}
                            {CardForm(card)}
                          </div>
                        ))}

                      <div className="mt-5">
                        <Button
                          className="flex items-center space-x-2"
                          onClick={() => handleCard(step.id, 'card')}
                        >
                          <PlusIcon className="text-white" />
                          <span>And</span>
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ))}

              <CardFooter>
                <div className="flex flex-col items-center space-y-2 w-full">
                  <Separator />
                  <div className="w-full flex justify-start">
                    {' '}
                    {/* Adjusted line */}
                    <Button
                      className="flex items-center space-x-2"
                      onClick={() => handleShowStep(form.id, 'step')}
                      variant="ghost"
                    >
                      <span>Add Step</span>
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        ))}
      </>
    );
  };

  /*   const excludeSimpleForm = () => {
      return (
        <>
          {excludeSimpleFormsToShow.map((form, index) => (
            <div key={form.id}>
              {index > 0 && (
                <div className="w-10 flex flex-col items-center justify-center space-y-2">
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                  <Badge variant="secondary">AND</Badge>
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                </div>
              )}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <CircleIcon className="text-blue-500 mr-2" />
                    <span className="flex-grow text-sm font-medium">Exclude users when:</span>
                    <div className="flex items-center space-x-2">
                      <UserPlusIcon className="text-gray-600" />
                      <Select>
                        <SelectTrigger id="user-action">
                          <SelectValue placeholder="Condition scoping" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {SimpleScope.map((item) => (
                            <SelectItem key={item.label} value={item.id}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Separator orientation="vertical" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSimpleForm(form.id, 'exclude')}
                      >
                        <TrashIcon className="text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
  
                <CardContent>
                  {excludeCardsToShow
                    .filter((card) => card.parentId === form.id)
                    .map((card, index) => (
                      <div key={card.id}>
                        {index > 0 && (
                          <div className="w-10 flex flex-col items-center justify-center space-y-2">
                            <div className="h-5">
                              <Separator orientation="vertical" />
                            </div>
                            <Badge variant="secondary">AND</Badge>
                            <div className="h-5">
                              <Separator orientation="vertical" />
                            </div>
                          </div>
                        )}
                        {CardForm(card)}
                      </div>
                    ))}
  
                  <div className="mt-5">
                    <Button
                      className="flex items-center space-x-2"
                      onClick={() => handleCard(form.id, 'excludeCard')}
                    >
                      <PlusIcon className="text-white" />
                      <span>And</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </>
      );
    };
  
    const excludeSequenceForm = () => {
      return (
        <>
          {excludeSequenceFormsToShow.map((form, index) => (
            <div key={form.id}>
              {index > 0 && (
                <div className="w-10 flex flex-col items-center justify-center space-y-2">
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                  <Badge variant="secondary">AND</Badge>
                  <div className="h-5">
                    <Separator orientation="vertical" />
                  </div>
                </div>
              )}
  
              <Card>
                <CardHeader>
                  <div className="flex items-center w-full">
                    <div className="flex basis-5/12">
                      <CircleIcon className="text-blue-500 mr-2" />
                      <span className="flex text-sm font-medium">Exclude sequence:</span>
                    </div>
  
                    <div className="flex flex-grow basis-7/12 justify-end">
                      <div className="flex items-center space-x-2">
                        <UserPlusIcon className="text-gray-600" />
                        <Select>
                          <SelectTrigger id="user-action">
                            <SelectValue placeholder="Sequence scoping" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {SequenceScope.map((item) => (
                              <SelectItem key={item.label} value={item.id}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Separator orientation="vertical" />
                        {TimeConstraint()}
                        <Separator orientation="vertical" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSequenceForm(form.id, 'exclude')}
                        >
                          <TrashIcon className="text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center space-y-2 w-full pt-2">
                    <Separator />
                  </div>
                </CardHeader>
  
                {excludeShowStep
                  .filter((step) => step.parentId === form.id)
                  .map((step, stepIndex) => (
                    <>
                      <CardContent key={step.id}>
                        {stepIndex >= 1 ? (
                          <div className="flex items-center w-full">
                            <div className="flex flex-grow basis-full justify-start bg-gray-300 rounded p-2">
                              <div className="flex items-center space-x-2">
                                <Select>
                                  <SelectTrigger
                                    id="user-action"
                                    className="border-none outline-none focus:outline-none focus:ring-0 shadow-none"
                                  >
                                    <SelectValue
                                      placeholder="followed by"
                                      className="border-none outline-none focus:outline-none focus:ring-0"
                                    />
                                  </SelectTrigger>
                                  <SelectContent
                                    position="popper"
                                    className="border-none outline-none focus:outline-none focus:ring-0"
                                  >
                                    {ImmediatelyFollows.map((item) => (
                                      <SelectItem key={item.label} value={item.id}>
                                        {item.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
  
                                <Separator orientation="vertical" className="bg-gray-400" />
                                {TimeConstraint()}
                              </div>
                            </div>
                          </div>
                        ) : null}
  
                        <div className="flex items-center w-full mt-5">
                          <div className="basis-3/12">
                            <p>Step {stepIndex + 1}</p>
                          </div>
                          <div className="flex flex-grow basis-9/12 justify-end">
                            <div className="flex items-center space-x-2">
                              <UserPlusIcon className="text-gray-600" />
                              <Select>
                                <SelectTrigger id="user-action">
                                  <SelectValue placeholder="Step scoping" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {SimpleScope.map((item) => (
                                    <SelectItem key={item.label} value={item.id}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Separator orientation="vertical" />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveStep(step.id, 'exclude')}
                              >
                                <TrashIcon className="text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
  
                        {excludeCardsToShow
                          .filter((card) => card.parentId === step.id)
                          .map((card, index) => (
                            <div key={card.id}>
                              {index > 0 && (
                                <div className="w-10 flex flex-col items-center justify-center space-y-2">
                                  <div className="h-5">
                                    <Separator orientation="vertical" />
                                  </div>
                                  <Badge variant="secondary">AND</Badge>
                                  <div className="h-5">
                                    <Separator orientation="vertical" />
                                  </div>
                                </div>
                              )}
                              {CardForm(card)}
                            </div>
                          ))}
  
                        <div className="mt-5">
                          <Button
                            className="flex items-center space-x-2"
                            onClick={() => handleCard(step.id, 'excludeCard')}
                          >
                            <PlusIcon className="text-white" />
                            <span>And</span>
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  ))}
  
                <CardFooter>
                  <div className="flex flex-col items-center space-y-2 w-full">
                    <Separator />
                    <div className="w-full flex justify-start">
                      {' '}
                    
  <Button
    className="flex items-center space-x-2"
    onClick={() => handleShowStep(form.id, 'excludeStep')}
    variant="ghost"
  >
    <span>Add Step</span>
  </Button>
                    </div >
                  </div >
                </CardFooter >
              </Card >
            </div >
          ))}
        </>
      );
    }; */

  return (
    <div className="flex h-full">
      <div className="flex items-center justify-center h-screen mx-auto">
        {currentStep === 1 && (
          <Form {...formCreateAmount}>
            <form className="w-full space-y-6">
              {/* Amount selection logic */}
              <FormField
                control={formCreateAmount.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How many properties do you want to create?</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value); // Use field.onChange to update the form value
                        handleAmountChange(value); // Call the modified handler
                      }}
                      value={field.value.toString()} // Ensure the Select reflects the form state
                      defaultValue={count.toString()}
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
      </div>

      {currentStep > 1 && (
        <div className="w-full flex justify-center mx-auto">
          {fields.length >= currentStep - 1 && (
            <div
              key={fields[currentFormIndex].id}
              className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
            >
              <div className="max-w-xl mx-auto">
                <h1>Audience {currentStep - 1}</h1>
                <div className="mt-12">
                  {/* Form */}

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(processForm)}
                      id={`createAudience-${currentStep - 1}`}
                      className="space-y-6"
                    >
                      {(() => {
                        return (
                          <>
                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-1/3">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.displayName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Audience Name</FormLabel>
                                      <FormDescription>
                                        This is the audience event name you want to create.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Audience name"
                                          {...form.register(
                                            `forms.${currentFormIndex}.displayName`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="w-full md:basis-1/3">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormDescription>
                                        This is the description of the audience event you want to
                                        add.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="Audience description"
                                          {...form.register(
                                            `forms.${currentFormIndex}.description`
                                          )}
                                          {...field}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="w-full md:basis-1/3">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.membershipDurationDays`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Membership Duration Days</FormLabel>
                                      <FormDescription>
                                        Required. Immutable. The duration a user should stay in an
                                        Audience. It cannot be set to more than 540 days.
                                      </FormDescription>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="Membership Duration Days"
                                          {...form.register(
                                            `forms.${currentFormIndex}.membershipDurationDays`
                                          )}
                                          {...field}
                                          max={540}
                                          min={1}
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="max-w-4xl mx-auto p-5">
                              {simpleForm()}

                              {simpleFormsToShow.length > 0 && sequenceFormsToShow.length > 0 && (
                                <div className="w-10 flex flex-col items-center justify-center space-y-2">
                                  <div className="h-5">
                                    <Separator orientation="vertical" />
                                  </div>
                                  <Badge variant="secondary">AND</Badge>
                                  <div className="h-5">
                                    <Separator orientation="vertical" />
                                  </div>
                                </div>
                              )}

                              {sequenceForm()}

                              <div className="flex items-center justify-between mt-6">
                                <Button
                                  className="flex items-center space-x-2"
                                  variant="secondary"
                                  onClick={() => handleShowForm('simple')}
                                >
                                  <PlusIcon className="text-white" />
                                  <span>Add condition group to include</span>
                                </Button>
                                <Button
                                  className="flex items-center space-x-2"
                                  variant="secondary"
                                  onClick={() => handleShowForm('sequence')}
                                >
                                  <BarChartIcon className="text-white" />
                                  <span>Add sequence to include</span>
                                </Button>
                              </div>
                            </div>

                            <div className="max-w-4xl mx-auto pl-5">
                              <div className="flex items-center justify-between">
                                {showExcludeParent.length === 0 && (
                                  <div className="flex items-center justify-between">
                                    <Button
                                      className="flex items-center space-x-2"
                                      variant="secondary"
                                      onClick={() => handleShowForm('excludeShowParent')}
                                    >
                                      <ValueNoneIcon className="text-red" />
                                      <span>Add group to exclude</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/*      {showExcludeParent.map((form, index) => (
                              <div className="max-w-4xl mx-auto p-5">
                                <div className="flex items-center">
                                  <div className="flex basis-9 mb-5">
                                    <Select>
                                      <SelectTrigger id="user-action">
                                        <SelectValue placeholder="Select action" />
                                      </SelectTrigger>
                                      <SelectContent position="popper">
                                        <SelectItem value="created">Created</SelectItem>
                                        <SelectItem value="updated">Updated</SelectItem>
                                        <SelectItem value="deleted">Deleted</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {excludeSimpleForm()}

                                {excludeSimpleFormsToShow.length > 0 &&
                                  excludeSequenceFormsToShow.length > 0 && (
                                    <div className="w-10 flex flex-col items-center justify-center space-y-2">
                                      <div className="h-5">
                                        <Separator orientation="vertical" />
                                      </div>
                                      <Badge variant="secondary">AND</Badge>
                                      <div className="h-5">
                                        <Separator orientation="vertical" />
                                      </div>
                                    </div>
                                  )}

                                {excludeSequenceForm()}

                                <div className="flex items-center justify-between mt-6">
                                  <Button
                                    className="flex items-center space-x-2"
                                    variant="secondary"
                                    onClick={() => handleShowForm('excludeSimple')}
                                  >
                                    <PlusIcon className="text-white" />
                                    <span>Add condition group to exclude</span>
                                  </Button>
                                  <Button
                                    className="flex items-center space-x-2"
                                    variant="secondary"
                                    onClick={() => handleShowForm('excludeSequence')}
                                  >
                                    <BarChartIcon className="text-white" />
                                    <span>Add sequence to exclude</span>
                                  </Button>
                                </div>
                              </div>
                            ))} */}

                            <div className="flex flex-col md:flex-row md:space-x-4">
                              <div className="w-full md:basis-auto">
                                <FormField
                                  control={form.control}
                                  name={`forms.${currentFormIndex}.account`}
                                  render={() => (
                                    <FormItem>
                                      <div className="mb-4">
                                        <FormLabel className="text-base">
                                          Account and Property Selection
                                        </FormLabel>
                                        <FormDescription>
                                          Which account and property do you want to create the
                                          audience for?
                                        </FormDescription>
                                      </div>
                                      {uniqueData.map((item) => (
                                        <FormField
                                          key={item.id}
                                          control={form.control}
                                          name={`forms.${currentFormIndex}.account`}
                                          render={({ field }) => {
                                            return (
                                              <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                              >
                                                <FormControl>
                                                  <Checkbox
                                                    checked={
                                                      Array.isArray(field.value) &&
                                                      field.value.includes(item.id)
                                                    }
                                                    onCheckedChange={(checked) => {
                                                      return checked
                                                        ? field.onChange([
                                                            ...(Array.isArray(field.value)
                                                              ? field.value
                                                              : []),
                                                            item.id,
                                                          ])
                                                        : field.onChange(
                                                            (Array.isArray(field.value)
                                                              ? field.value
                                                              : []
                                                            ).filter((value) => value !== item.id)
                                                          );
                                                    }}
                                                  />
                                                </FormControl>
                                                <FormLabel className="text-sm font-normal">
                                                  {item.label}
                                                </FormLabel>
                                              </FormItem>
                                            );
                                          }}
                                        />
                                      ))}
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </>
                        );
                      })()}

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

                  {/* End Form */}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormCreateAudience;
