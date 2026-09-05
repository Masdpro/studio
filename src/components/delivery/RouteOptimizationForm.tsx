'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { PlusCircle, Trash2 } from 'lucide-react';
import type { OptimizeDeliveryRouteInput } from '@/ai/flows/optimize-delivery-route';

const timeWindowSchema = z.object({
  location: z.string().min(1, "Location cannot be empty"),
  startTime: z.string().datetime({ message: "Invalid start date/time" }),
  endTime: z.string().datetime({ message: "Invalid end date/time" }),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: "End time must be after start time",
  path: ["endTime"],
});


const routeOptimizationSchema = z.object({
  startLocation: z.string().min(3, { message: 'Start location must be at least 3 characters.' }),
  deliveryLocations: z.array(z.string().min(3, { message: 'Delivery location must be at least 3 characters.' })).min(1, { message: 'At least one delivery location is required.' }),
  timeWindows: z.array(timeWindowSchema).optional(),
  currentTrafficConditions: z.string().min(5, { message: 'Traffic conditions must be at least 5 characters.' }),
});

export type RouteOptimizationFormValues = z.infer<typeof routeOptimizationSchema>;

interface RouteOptimizationFormProps {
  onSubmit: (data: OptimizeDeliveryRouteInput) => void;
  isLoading: boolean;
}

export function RouteOptimizationForm({ onSubmit, isLoading }: RouteOptimizationFormProps) {
  const form = useForm<RouteOptimizationFormValues>({
    resolver: zodResolver(routeOptimizationSchema),
    defaultValues: {
      startLocation: '',
      deliveryLocations: [''],
      timeWindows: [],
      currentTrafficConditions: '',
    },
  });

  // deliveryLocations is a plain string[] (not an array of objects), so it's
  // managed directly via watch/setValue rather than useFieldArray.
  const deliveryLocations = form.watch('deliveryLocations');
  const appendDeliveryLocation = (value: string) =>
    form.setValue('deliveryLocations', [...form.getValues('deliveryLocations'), value]);
  const removeDeliveryLocation = (index: number) =>
    form.setValue(
      'deliveryLocations',
      form.getValues('deliveryLocations').filter((_, i) => i !== index)
    );

  const { fields: timeWindowFields, append: appendTimeWindow, remove: removeTimeWindow } = useFieldArray({
    control: form.control,
    name: "timeWindows"
  });

  function handleFormSubmit(data: RouteOptimizationFormValues) {
     const apiInput: OptimizeDeliveryRouteInput = {
      startLocation: data.startLocation,
      deliveryLocations: data.deliveryLocations,
      timeWindows: data.timeWindows ? data.timeWindows.map(tw => ({
        location: tw.location,
        startTime: new Date(tw.startTime).toISOString(),
        endTime: new Date(tw.endTime).toISOString(),
      })) : [],
      currentTrafficConditions: data.currentTrafficConditions,
    };
    onSubmit(apiInput);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="startLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Location</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Warehouse A, 123 Main St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Delivery Locations</FormLabel>
          {deliveryLocations.map((_, index) => (
            <FormField
              control={form.control}
              key={index}
              name={`deliveryLocations.${index}`}
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 mt-2">
                  <FormControl>
                    <Input placeholder={`Delivery Stop ${index + 1}`} {...field} />
                  </FormControl>
                  {deliveryLocations.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDeliveryLocation(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => appendDeliveryLocation("")}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Delivery Location
          </Button>
        </div>
        
        <div>
          <FormLabel>Time Windows (Optional)</FormLabel>
          {timeWindowFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-md mt-2 space-y-2">
              <FormField
                control={form.control}
                name={`timeWindows.${index}.location`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location for Time Window</FormLabel>
                    <FormControl><Input placeholder="Matches a delivery location above" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`timeWindows.${index}.startTime`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`timeWindows.${index}.endTime`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeTimeWindow(index)}>
                 <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Remove Time Window
              </Button>
            </div>
          ))}
           <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => appendTimeWindow({ location: "", startTime: "", endTime: "" })}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Time Window
          </Button>
        </div>

        <FormField
          control={form.control}
          name="currentTrafficConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Traffic Conditions</FormLabel>
              <FormControl>
                <Textarea placeholder="E.g., Heavy traffic on I-95, moderate on local roads" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
          {isLoading ? 'Optimizing...' : 'Optimize Route'}
        </Button>
      </form>
    </Form>
  );
}
