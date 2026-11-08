
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { useSearchParams } from 'next/navigation';
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
import { UploadCloud } from 'lucide-react';
import { sanitizeOptions, sanitizeStock } from '@/lib/product-media';
import { ProductMediaField } from '@/components/vendor/ProductMediaField';
import { Separator } from '@/components/ui/separator';

const productSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  imageUrl: z.string().regex(/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/, { message: 'Add at least one photo of the product.' }),
  galleryImages: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  category: z.string().optional(),
  colors: z.string().optional(),
  sizes: z.string().optional(),
  stock: z.string().optional(),
  aiHint: z.string().optional().refine(value => !value || value.split(' ').length <= 2, {
    message: "AI hint can have at most two words."
  }),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductUploadFormProps {
  onProductAdd?: (product: Omit<ProductFormValues, 'colors' | 'sizes' | 'stock'> & { colors: string[]; sizes: string[]; stock?: number }) => void;
}

export function ProductUploadForm({ onProductAdd }: ProductUploadFormProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Form state
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      galleryImages: [],
      videoUrl: '',
      category: '',
      colors: '',
      sizes: '',
      stock: '',
      aiHint: '',
    },
  });

  // File input state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);


  useEffect(() => {
    const name = searchParams.get('name');
    const description = searchParams.get('description');
    const category = searchParams.get('category');
    const aiHint = searchParams.get('aiHint');

    if (name) form.setValue('name', name);
    if (description) form.setValue('description', description);
    if (category) form.setValue('category', category);
    if (aiHint) form.setValue('aiHint', aiHint);

  }, [searchParams, form]);
  
  function onSubmit(data: ProductFormValues) {
        if (onProductAdd) {
      onProductAdd({ ...data, colors: sanitizeOptions(data.colors), sizes: sanitizeOptions(data.sizes), stock: sanitizeStock(data.stock) ?? undefined });
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
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Wireless Headphones" {...field} />
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
                <FormLabel>Price (₦)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="4500" {...field} />
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
                <FormLabel>Product Photos &amp; Video (at least one photo)</FormLabel>
                <FormControl>
                  <ProductMediaField
                    images={[field.value, ...(form.watch('galleryImages') ?? [])].filter((u): u is string => !!u)}
                    video={form.watch('videoUrl') ?? ''}
                    onChange={(imgs, vid) => {
                      field.onChange(imgs[0] ?? '');
                      form.setValue('galleryImages', imgs.slice(1), { shouldDirty: true });
                      form.setValue('videoUrl', vid, { shouldDirty: true });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="colors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colors (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Red, Blue, Black" {...field} />
                  </FormControl>
                  <FormDescription>Separate with commas. Customers must pick one.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sizes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sizes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="S, M, L, XL" {...field} />
                  </FormControl>
                  <FormDescription>Separate with commas. Customers must pick one.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity in stock (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={1} inputMode="numeric" placeholder="Leave blank if you don't track stock" {...field} />
                </FormControl>
                <FormDescription>Shows "Only N left" at 5 or fewer and "Sold out" at 0. Goes down automatically with each order.</FormDescription>
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
                  <Input placeholder="E.g., Electronics, Books, Apparel" {...field} />
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
                  <Input placeholder="E.g., 'laptop computer' (max 2 words)" {...field} />
                </FormControl>
                <FormDescription>
                  One or two keywords for AI image generation or search.
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
    </>
  );
}
