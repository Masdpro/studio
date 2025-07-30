
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, ScanLine, XCircle, Loader2, PackagePlus, Wand2, Search } from 'lucide-react';
import { identifyProductFromImage, type IdentifyProductOutput } from '@/ai/flows/identify-product-from-image';

type IdentifiedProduct = IdentifyProductOutput['products'][0];

export default function InventoryScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<IdentifyProductOutput | null>(null);
  const [lastScanImage, setLastScanImage] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

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

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission) return;
    
    setIsScanning(true);
    setScanResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUri = canvas.toDataURL('image/jpeg');
      setLastScanImage(photoDataUri);

      try {
        const result = await identifyProductFromImage({ photoDataUri });
        if (result.products.length === 0) {
            toast({ title: 'No Products Found', description: 'The AI could not identify any products in the image. Please try again.' });
        }
        setScanResult(result);
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

  const handleAddProduct = (product: IdentifiedProduct) => {
    // Store the large image data URI in sessionStorage
    if (lastScanImage) {
      sessionStorage.setItem('newProductImageDataUri', lastScanImage);
    }
    
    // Pass other small details via URL params
    const query = new URLSearchParams({
      name: product.name,
      description: product.description,
      category: product.category,
      aiHint: product.aiHint,
    });
    router.push(`/vendor/dashboard/products?${query.toString()}`);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Camera className="h-8 w-8 text-primary" />
            AI Inventory Scanner
          </CardTitle>
          <CardDescription>
            Point your camera at a product and use the AI to automatically identify and catalog it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
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
              <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>Enable camera permissions to use this feature.</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleScan}
              disabled={!hasCameraPermission || isScanning || isCameraInitializing}
              className="w-full"
              size="lg"
            >
              {isScanning ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ScanLine className="mr-2 h-5 w-5" />
              )}
              {isScanning ? 'Analyzing Image...' : 'Scan Product'}
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-primary" />
              Scan Results
            </h3>
            {isScanning && (
                <div className="text-center py-10">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-lg text-muted-foreground">AI is identifying the product...</p>
                </div>
            )}
            {!isScanning && !scanResult && (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Results will appear here after scanning.</p>
                </div>
            )}
            {scanResult && scanResult.products.length > 0 && (
                <div className="space-y-4">
                    {scanResult.products.map((product, index) => (
                        <Card key={index} className="shadow-md">
                            <CardHeader>
                                <CardTitle>{product.name}</CardTitle>
                                <CardDescription>Category: {product.category}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{product.description}</p>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={() => handleAddProduct(product)} className="w-full">
                                    <PackagePlus className="mr-2 h-4 w-4" />
                                    Add this Product to Inventory
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
             {!isScanning && scanResult && scanResult.products.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-semibold">No Products Identified</h4>
                    <p className="text-muted-foreground">Try a different angle or a clearer image.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
