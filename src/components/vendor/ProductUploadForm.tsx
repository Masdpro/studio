
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
import { UploadCloud, Trash2, Camera, ScanLine, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { identifyProductFromImage } from '@/ai/flows/identify-product-from-image';

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
  const searchParams = useSearchParams();

  // Form state
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

  // Scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // File input state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);


  const getCameraPermission = useCallback(async () => {
    setIsCameraInitializing(true);
    setHasCameraPermission(null);
    let newStream: MediaStream | null = null;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    } catch (rearError) {
      console.warn('Rear camera access failed, trying any camera:', rearError);
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (anyError) {
        console.error('Error accessing any camera:', anyError);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Could not access any camera. Please enable permissions in your browser settings.',
        });
        setIsCameraInitializing(false);
        return;
      }
    }
    streamRef.current = newStream;
    setHasCameraPermission(true);
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
    }
    setIsCameraInitializing(false);
  }, [toast]);

  useEffect(() => {
    getCameraPermission();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [getCameraPermission]);

  useEffect(() => {
    // This effect handles pre-filling from URL params, but NOT from session storage anymore.
    const name = searchParams.get('name');
    const description = searchParams.get('description');
    const category = searchParams.get('category');
    const aiHint = searchParams.get('aiHint');

    if (name) form.setValue('name', name);
    if (description) form.setValue('description', description);
    if (category) form.setValue('category', category);
    if (aiHint) form.setValue('aiHint', aiHint);

  }, [searchParams, form]);
  
  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission) return;
    
    setIsScanning(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUri = canvas.toDataURL('image/jpeg');

      try {
        const result = await identifyProductFromImage({ photoDataUri });
        if (result.products.length > 0) {
            const product = result.products[0];
            // Pre-fill the form with AI data
            form.setValue('name', product.name);
            form.setValue('description', product.description);
            form.setValue('category', product.category);
            form.setValue('aiHint', product.aiHint);
            form.setValue('imageUrl', photoDataUri);
            toast({ title: 'Product Identified!', description: `Form has been pre-filled for "${product.name}".` });
        } else {
            toast({ title: 'No Products Found', description: 'The AI could not identify any products in the image. Please try again.' });
        }
      } catch (err) {
        console.error('Error identifying product:', err);
        toast({
          title: 'AI Scan Failed',
          description: 'An error occurred while analyzing the image.',
          variant: 'destructive',
        });
      }
    }
    setIsScanning(false);
  };


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
    <>
      <div className="mb-6 border p-4 rounded-lg">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <Camera className="h-5 w-5 text-primary" />
            AI Product Scanner
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
            <div>
                 <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden border">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {isCameraInitializing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/90 text-destructive-foreground p-4 text-center">
                        <XCircle className="h-12 w-12 mb-2" />
                        <p className="font-semibold">Camera Access Denied</p>
                        </div>
                    )}
                </div>
                 {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mt-2">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>Enable camera permissions to use this feature.</AlertDescription>
                    </Alert>
                )}
            </div>
            <div className="flex flex-col justify-center items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">Point your camera at a product and scan it to auto-fill the form.</p>
                <Button
                    type="button"
                    onClick={handleScan}
                    disabled={!hasCameraPermission || isScanning || isCameraInitializing}
                    className="w-full max-w-xs"
                    size="lg"
                    >
                    {isScanning ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <ScanLine className="mr-2 h-5 w-5" />
                    )}
                    {isScanning ? 'Analyzing Image...' : 'Scan Product & Fill Form'}
                </Button>
            </div>
        </div>
      </div>
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
                <FormLabel>Price ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="99.99" {...field} />
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
                      fill={true}
                      style={{ objectFit: 'cover' }}
                      data-ai-hint={field.value.startsWith('data:') ? "product preview" : (form.getValues('aiHint') || "product item")}
                      sizes="128px"
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
