// src/components/reviews/LeaveReviewForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, MessageSquare, Building, Bike } from 'lucide-react';

const reviewSchema = z.object({
  vendorRating: z.enum(['positive', 'negative'], { required_error: "Please rate the vendor." }),
  vendorComment: z.string().optional(),
  agentRating: z.enum(['positive', 'negative']).optional(),
  agentComment: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface LeaveReviewFormProps {
  orderId: string;
  vendorId: string;
  deliveryAgentId?: string;
  onReviewSubmit: () => void;
}

export function LeaveReviewForm({ orderId, vendorId, deliveryAgentId, onReviewSubmit }: LeaveReviewFormProps) {
  const { toast } = useToast();
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      vendorRating: undefined,
      vendorComment: '',
      agentRating: undefined,
      agentComment: '',
    },
  });

  function onSubmit(data: ReviewFormValues) {
    console.log('Review for order:', orderId, {
      vendorReview: {
        vendorId,
        rating: data.vendorRating,
        comment: data.vendorComment,
      },
      ...(deliveryAgentId && data.agentRating && { // only include agent review if agentId and rating exist
        agentReview: {
          agentId: deliveryAgentId,
          rating: data.agentRating,
          comment: data.agentComment,
        }
      })
    });
    
    toast({
      title: 'Review Submitted!',
      description: 'Thank you for your feedback.',
    });
    onReviewSubmit(); // Close dialog or update UI
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Vendor Review Section */}
        <div className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold flex items-center">
            <Building className="h-5 w-5 mr-2 text-primary" />
            Rate Vendor: <span className="text-sm text-muted-foreground ml-1">({vendorId})</span>
          </h3>
          <FormField
            control={form.control}
            name="vendorRating"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Your rating for the vendor:</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex gap-4"
                  >
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <RadioGroupItem value="positive" id={`vendor-positive-${orderId}`} className="sr-only" />
                      </FormControl>
                      <FormLabel
                        htmlFor={`vendor-positive-${orderId}`}
                        className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${field.value === 'positive' ? 'bg-green-100 border-green-500 text-green-700' : 'hover:bg-muted'}`}
                      >
                        <ThumbsUp className="h-6 w-6" /> Positive
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <RadioGroupItem value="negative" id={`vendor-negative-${orderId}`} className="sr-only" />
                      </FormControl>
                      <FormLabel
                        htmlFor={`vendor-negative-${orderId}`}
                        className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${field.value === 'negative' ? 'bg-red-100 border-red-500 text-red-700' : 'hover:bg-muted'}`}
                      >
                        <ThumbsDown className="h-6 w-6" /> Negative
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vendorComment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />Vendor Comment (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Share your experience with the vendor..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Delivery Agent Review Section - Only if deliveryAgentId is present */}
        {deliveryAgentId && (
          <div className="space-y-4 p-4 border rounded-md">
            <h3 className="text-lg font-semibold flex items-center">
              <Bike className="h-5 w-5 mr-2 text-primary" />
              Rate Delivery Agent: <span className="text-sm text-muted-foreground ml-1">({deliveryAgentId})</span>
            </h3>
             <FormField
              control={form.control}
              name="agentRating"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Your rating for the delivery agent:</FormLabel>
                   <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="positive" id={`agent-positive-${orderId}`} className="sr-only" />
                        </FormControl>
                        <FormLabel
                          htmlFor={`agent-positive-${orderId}`}
                          className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${field.value === 'positive' ? 'bg-green-100 border-green-500 text-green-700' : 'hover:bg-muted'}`}
                        >
                          <ThumbsUp className="h-6 w-6" /> Positive
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                           <RadioGroupItem value="negative" id={`agent-negative-${orderId}`} className="sr-only" />
                        </FormControl>
                        <FormLabel
                          htmlFor={`agent-negative-${orderId}`}
                          className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${field.value === 'negative' ? 'bg-red-100 border-red-500 text-red-700' : 'hover:bg-muted'}`}
                        >
                          <ThumbsDown className="h-6 w-6" /> Negative
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agentComment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />Agent Comment (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Share your experience with the delivery agent..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
          Submit Reviews
        </Button>
      </form>
    </Form>
  );
}
