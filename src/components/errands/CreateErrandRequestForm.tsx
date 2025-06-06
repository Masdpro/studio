
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBasket, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

const errandRequestSchema = z.object({
  itemsDescription: z.string().min(10, { message: 'Please describe the items you need (at least 10 characters).' }).max(1000, { message: 'Description is too long (max 1000 characters).' }),
  preferredStore: z.string().optional(),
  deliveryAddress: z.string().min(10, { message: 'Delivery address must be at least 10 characters.' }),
});

type ErrandRequestFormValues = z.infer<typeof errandRequestSchema>;

export function CreateErrandRequestForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<ErrandRequestFormValues>({
    resolver: zodResolver(errandRequestSchema),
    defaultValues: {
      itemsDescription: '',
      preferredStore: '',
      deliveryAddress: '', // Should pre-fill from user profile in a real app
    },
  });

  function onSubmit(data: ErrandRequestFormValues) {
    console.log('Errand request data:', data);
    // Placeholder for actual submission logic
    // In a real app, this would create an ErrandRequest in the DB
    // and update the local state or redirect.
    toast({
      title: 'Errand Request Submitted!',
      description: 'Your errand request has been posted. Agents will now be able to quote on it.',
    });
    form.reset();
    // Optionally, redirect to the "My Errands" page
    router.push('/errands');
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <ShoppingBasket className="h-6 w-6 text-primary" />
          Create New Errand Request
        </CardTitle>
        <CardDescription>List the items you need, and an agent will run the errand for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="itemsDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Items to Purchase</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please list each item on a new line with details if necessary. E.g.,\n- 1 Gallon Whole Milk (Brand XYZ)\n- 2 Apples (Granny Smith)\n- 1 Box of Cereal (Cheerios, Large)"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Be as specific as possible with brands, sizes, and quantities.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferredStore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Store (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Target, Walmart, Local Corner Store" {...field} />
                  </FormControl>
                  <FormDescription>
                    If you have a preferred store, let the agent know. Otherwise, they will choose a suitable one.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full delivery address" {...field} />
                  </FormControl>
                  <FormDescription>
                    Where should the agent deliver your items?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              <Send className="mr-2 h-4 w-4" /> Post Errand Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
