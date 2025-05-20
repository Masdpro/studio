// src/components/reviews/ReviewDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LeaveReviewForm } from './LeaveReviewForm';
import type { Order } from '@/lib/types';
import { Star } from 'lucide-react';

interface ReviewDialogProps {
  order: Order;
  onReviewSubmitted: () => void;
  isReviewSubmitted: boolean;
}

export function ReviewDialog({ order, onReviewSubmitted, isReviewSubmitted }: ReviewDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleFormSubmit = () => {
    onReviewSubmitted();
    setOpen(false); // Close dialog after submission
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isReviewSubmitted ? "ghost" : "outline"} 
          size="sm"
          disabled={isReviewSubmitted}
          className={isReviewSubmitted ? "text-green-600 cursor-default" : "border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"}
        >
          <Star className="h-4 w-4 mr-2" />
          {isReviewSubmitted ? "Review Submitted" : "Leave a Review"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Leave Your Review for Order {order.id}
          </DialogTitle>
          <DialogDescription>
            Your feedback helps us and other users. Please rate your experience with the vendor
            {order.deliveryAgentId && " and the delivery agent"}.
          </DialogDescription>
        </DialogHeader>
        <LeaveReviewForm
          orderId={order.id}
          vendorId={order.vendorId}
          deliveryAgentId={order.deliveryAgentId}
          onReviewSubmit={handleFormSubmit}
        />
        <DialogFooter className="mt-4">
            <DialogClose asChild>
                 <Button type="button" variant="outline">
                    Cancel
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
