
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useRef } from 'react';
import Image from 'next/image';
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
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Trash2 } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  imageUrl: z.string().url({ message: 'Please upload a file or enter a valid image URL.' }).optional().or(z.literal('')),
  category: z.string().optional(),
  aiHint: z.string().optional().refine(value => !value || value.split(' ').length <= 2, {
    message: "AI hint can have at most two words."
  }),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductUploadFormProps {
  onProductAdd?: (product: ProductFormValues) => void;
}

export function ProductUploadForm({ onProductAdd }: ProductUploadFormProps) {
  const { toast } = useToast();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      category: '',
      aiHint: '',
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  function onSubmit(data: ProductFormValues) {
    console.log('New product data:', data);
    if (onProductAdd) {
      onProductAdd(data);
    }
    toast({
      title: 'Product Added!',
      description: `${data.name} has been successfully added.`,
    });
    form.reset();
    setSelectedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        fieldOnChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFileName(null);
    }
  };

  const handleClearImage = (fieldOnChange: (value: string) => void) => {
    fieldOnChange('');
    setSelectedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Margherita Pizza" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Detailed description of the product" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price ($)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="9.99" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Image</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e, field.onChange)}
                  />
                  {selectedFileName && (
                    <p className="text-sm text-muted-foreground">
                      Selected file: {selectedFileName}
                    </p>
                  )}
                  <div className="relative flex items-center">
                     <span className="absolute left-3 text-muted-foreground text-sm">URL:</span>
                     <Input
                        type="url"
                        placeholder="Or paste image URL"
                        className="pl-12" 
                        value={field.value?.startsWith('http') ? field.value : ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setSelectedFileName(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        disabled={!!(field.value && field.value.startsWith('data:'))}
                      />
                  </div>

                </div>
              </FormControl>
              {field.value && (
                <div className="mt-4 relative w-32 h-32 border rounded-md overflow-hidden">
                  <Image
                    src={field.value}
                    alt="Product Preview"
                    width={128}
                    height={128}
                    data-ai-hint="product item"
                  />
                </div>
              )}
              {field.value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearImage(field.onChange)}
                    className="text-destructive hover:bg-destructive/10 mt-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Image
                  </Button>
              )}
              <FormDescription>
                Upload an image file or paste a direct URL for the product image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Pizza, Burgers, Salads" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aiHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Hint (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="E.g., 'food pizza' (max 2 words)" {...field} />
              </FormControl>
              <FormDescription>
                One or two keywords for AI image generation or search (e.g., "pizza margherita").
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          <UploadCloud className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </form>
    </Form>
  );
}
