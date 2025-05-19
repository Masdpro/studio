// src/components/auth/DeliveryAgentRegistrationForm.tsx
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
import { Bike, UserPlus } from 'lucide-react';

const deliveryAgentRegistrationSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }),
  vehicleDetails: z.string().optional(),
});

type DeliveryAgentRegistrationFormValues = z.infer<typeof deliveryAgentRegistrationSchema>;

export function DeliveryAgentRegistrationForm() {
  const { toast } = useToast();
  const form = useForm<DeliveryAgentRegistrationFormValues>({
    resolver: zodResolver(deliveryAgentRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      vehicleDetails: '',
    },
  });

  function onSubmit(data: DeliveryAgentRegistrationFormValues) {
    console.log('Delivery Agent registration data:', data);
    // Placeholder for actual registration logic
    toast({
      title: 'Registration Submitted!',
      description: 'Your delivery agent registration has been received.',
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Bike className="h-6 w-6 text-primary" />
          Become a Delivery Agent
        </CardTitle>
        <CardDescription>Sign up to start delivering with Swiftbuy.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="agent@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="123-456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Rider St, City, Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="E.g., Motorcycle - Honda Wave, Plate: ABC 123" {...field} />
                  </FormControl>
                  <FormDescription>
                    Let us know what vehicle you'll be using for deliveries.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Register as Delivery Agent
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
