'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import type { DeliveryAgent } from '@/lib/types';

const agentSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  phone: z.string().min(5, { message: 'Please enter a valid phone number.' }),
  streetAddress: z.string().min(2, { message: 'Street address is required.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  country: z.string().min(2, { message: 'Country is required.' }),
  vehicleDetails: z.string().optional(),
  imageUrl: z.string().optional(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

interface AgentFormDialogProps {
  agent: DeliveryAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function agentToFormValues(agent: DeliveryAgent | null): AgentFormValues {
  return {
    name: agent?.name ?? '',
    email: agent?.email ?? '',
    phone: agent?.phone ?? '',
    streetAddress: agent?.streetAddress ?? '',
    city: agent?.city ?? '',
    country: agent?.country ?? 'Nigeria',
    vehicleDetails: agent?.vehicleDetails ?? '',
    imageUrl: agent?.imageUrl ?? '',
  };
}

export function AgentFormDialog({ agent, open, onOpenChange, onSaved }: AgentFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: agentToFormValues(agent),
  });

  useEffect(() => {
    form.reset(agentToFormValues(agent));
  }, [agent, form]);

  async function onSubmit(data: AgentFormValues) {
    setIsSaving(true);
    try {
      const url = agent ? `/api/admin/agents/${agent.id}` : '/api/admin/agents';
      const res = await fetch(url, {
        method: agent ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to save agent.' }));
        throw new Error(error ?? 'Failed to save agent.');
      }
      toast({ title: agent ? 'Agent updated!' : 'Agent created!', description: `${data.name} has been saved.` });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  const textField = (name: keyof AgentFormValues, label: string, placeholder: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit Delivery Agent' : 'New Delivery Agent'}</DialogTitle>
          <DialogDescription>
            {agent ? `Update the details for ${agent.name}.` : 'Add a new delivery agent.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <div className="flex-1 min-h-0 overflow-y-auto -mr-6 pr-6">
              <div className="space-y-4 py-1">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Photo</FormLabel>
                      <FormControl>
                        <ImageUploadField value={field.value ?? ''} onChange={field.onChange} emptyLabel="No photo yet" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {textField('name', 'Full Name', 'E.g., Chinedu Okeke')}
                <div className="grid grid-cols-2 gap-4">
                  {textField('email', 'Email', 'agent@example.com')}
                  {textField('phone', 'Phone', '07033445566')}
                </div>
                {textField('streetAddress', 'Street Address', '22 Opebi Road')}
                <div className="grid grid-cols-2 gap-4">
                  {textField('city', 'City', 'Ikeja, Lagos')}
                  {textField('country', 'Country', 'Nigeria')}
                </div>
                {textField('vehicleDetails', 'Vehicle Details (Optional)', 'Motorcycle - Black, Plate: KJA-123-AB')}
              </div>
            </div>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
