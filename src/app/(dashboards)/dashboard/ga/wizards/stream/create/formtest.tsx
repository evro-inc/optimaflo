'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setFormData,
  setLoading,
  setError,
  setCurrentStep,
  incrementStep,
  decrementStep,
  setStreamCount,
} from '@/redux/formSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormCreateAmountSchema } from '@/src/lib/schemas/ga/streams';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

const FormCreateStream = (tierLimits) => {
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.form.loading);
  const error = useSelector((state) => state.form.error);
  const currentStep = useSelector((state) => state.form.currentStep);
  const streamCount = useSelector((state) => state.form.streamCount);

  const foundTierLimit = tierLimits.tierLimits.find(
    (tierLimit) => tierLimit.Feature.name === 'GA4Streams'
  );

  const createLimit = foundTierLimit.createLimit;
  const createUsage = foundTierLimit.createUsage;
  const remainingCreate = createLimit - createUsage;

  const formCreateAmount = useForm({
    resolver: zodResolver(FormCreateAmountSchema),
    defaultValues: {
      amount: 1,
    },
  });

  // Effect to update streamCount when amount changes
  useEffect(() => {
    const amount = parseInt(formCreateAmount.getValues('amount').toString());
    dispatch(setStreamCount(amount));
  }, [formCreateAmount.watch('amount'), dispatch]);

  const handleNext = () => {    
    dispatch(incrementStep());
  };

  const handlePrevious = () => {
    dispatch(decrementStep());
  };

  const handleAmountSubmit = async (event) => {
    event.preventDefault(); // Prevent form submission as it's handled within the component
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    dispatch(setLoading(true));
    try {
      // Perform form submission logic here
    } catch (error) {
      dispatch(setError('An error occurred while submitting the form.'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div>
      {/* Conditional rendering based on the currentStep */}
      {currentStep === 1 && (
        <Form {...formCreateAmount}>
          <form
            onSubmit={formCreateAmount.handleSubmit(handleAmountSubmit)}
            className="w-2/3 space-y-6"
          >
            {/* Amount selection logic */}
            <FormField
              control={formCreateAmount.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many streams do you want to create?</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                  }} defaultValue={streamCount.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the amount of streams you want to create." />
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
      {/* Logic for steps after the first step */}
      {currentStep > 1 && currentStep <= streamCount + 1 && (
        <form onSubmit={handleSubmit}>
          <label htmlFor={`field${currentStep - 1}`}>Stream {currentStep - 1}:</label>
          <input type="text" name={`field${currentStep - 1}`} />
          <button type="button" onClick={handlePrevious}>
            Previous
          </button>
          {currentStep < streamCount + 1 ? (
            <button type="button" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="submit">Submit</button>
          )}
        </form>
      )}
      {/* Display loading or error messages */}
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
};

export default FormCreateStream;
