'use client';
import React, { useTransition } from 'react';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ButtonPrim } from '../client/Button/Button';
import Link from 'next/link';

const FormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

const WaitlistForm = () => {
  const [, startTransaction] = useTransition();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransaction(async () => {
      try {
        const res = await fetch('/api/resend', {
          method: 'POST',
          body: JSON.stringify({ email: data.email }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          form.reset();
          toast.success('Thank you for subscribing 🎉', {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss(),
            },
          });
        } else {
          console.error('Error:', res.status, res.statusText);
          toast.error('Something went wrong');
        }
      } catch (error) {
        console.error('Fetch error:', error);
      }
    });
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Ready to Get Started?
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Sign up for the waitlist and be the first to experience OptimaFlo.
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm space-y-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="your-email@example.com"
                        {...field}
                        className="max-w-lg flex-1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ButtonPrim type="submit" text={'Join the waitlist'} />
            </form>
          </Form>
          <p className="text-xs text-muted-foreground">
            By signing up, you agree to our{' '}
            <Link href="/tos" className="underline underline-offset-2" prefetch={false}>
              Terms &amp; Conditions
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default WaitlistForm;
