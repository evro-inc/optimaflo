'use client';

import React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,

  FormMessage,
} from "@/components/ui/form";
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { ButtonPrim } from '../client/Button/Button';
import { useForm } from 'react-hook-form';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from 'sonner';

const FormSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});


export default function CTA() {

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    async () => {
      try {
        const res = await fetch("/api/resend", {
          method: "POST",
          body: JSON.stringify({ email: data.email }),
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          form.reset();
          toast.success("Thank you for subscribing 🎉");
        } else {
          console.error("Error:", res.status, res.statusText);
          toast.error("Something went wrong");
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
  }





  /*         <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blueBackground via-blueLightBackground bg-blueBackground text-secondary">
            <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
              <div className="text-center mx-auto">
                <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl">
                  {homePage[0].ctaTitle}
                </h2>
              </div>
  
              <div className="max-w-2xl text-center mx-auto">
                <p className="text-lg">{homePage[0].ctaTitle}</p>
              </div>
  
              <div className="flex flex-row justify-center items-center text-center pt-5">
                <LinkSignUp className="w-1/4" variant="secondary" />
              </div>
            </div>
          </section>
   */


  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to Get Started?</h2>
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
                      <Input placeholder="your-email@example.com" {...field} className="max-w-lg flex-1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ButtonPrim type="submit" text={'Join the waitlist'} />
            </form>
          </Form>


          <p className="text-xs text-muted-foreground">
            By signing up, you agree to our{" "}
            <Link href="#" className="underline underline-offset-2" prefetch={false}>
              Terms &amp; Conditions
            </Link>
          </p>
        </div>
      </div>
    </section>
  )


}
