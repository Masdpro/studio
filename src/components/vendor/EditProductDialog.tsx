
'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
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
import { Loader2, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { ProductMediaField } from '@/components/vendor/ProductMediaField';

const editProductSchema = z.object({
  name: z.string().min(2, { message: 'Product name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  discountPrice: z.coerce.number().positive().optional().or(z.literal(NaN)),
  imageUrl: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  category: z.string().optional(),
  colors: z.string().optional(),
  sizes: z.string().optional(),
  stock: z.string().optional(),
});

type EditProductFormValues = z.infer<typeof editProductSchema>;

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function productToFormValues(product: Product | null): EditProductFormValues {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    discountPrice: product?.discountPrice ?? undefined,
    imageUrl: product?.imageUrl ?? '',
    galleryImages: product?.galleryImages ?? [],
    videoUrl: product?.videoUrl ?? '',
    category: product?.category ?? '',
    colors: (product?.colors ?? []).join(', '),
    sizes: (product?.sizes ?? []).join(', '),
    stock: product?.stock !== undefined ? String(product.stock) : '',
  };
}

export function EditProductDialog({ product, open, onOpenChange, onSaved }: EditProductDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: productToFormValues(product),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => fieldOnChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Re-sync the form whenever a different product is opened for editing.
  useEffect(() => {
    form.reset(productToFormValues(product));
  }, [product, form]);

  async function onSubmit(data: EditProductFormValues) {
    if (!product) return;
    setIsSaving(true);
    try {
      const payload = {
        ...data,
        discountPrice: Number.isFinite(data.discountPrice) ? data.discountPrice : undefined,
      };
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to update product.' }));
        throw new Error(error ?? 'Failed to update product.');
      }
      toast({ title: 'Product updated!', description: `${data.name} has been saved.` });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the details for {product?.name ?? 'this product'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <div className="flex-1 min-h-0 overflow-y-auto -mr-6 pr-6">
          <div className="space-y-4 py-1">
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
            <div className="grid grid-cols-2 gap-4">
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
                name="discountPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Price (₦, Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="3800"
                        {...field}
                        value={Number.isFinite(field.value) ? field.value : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Photos &amp; Video</FormLabel>
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
          </div>
          </div>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
