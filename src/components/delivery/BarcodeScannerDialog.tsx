
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, ScanLine, XCircle, Loader2 } from 'lucide-react';

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  scanPurpose: 'pickup' | 'delivery';
  onScanSuccess: (orderId: string, purpose: 'pickup' | 'delivery') => void;
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  orderId,
  scanPurpose,
  onScanSuccess,
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // For simulate scan button
  const { toast } = useToast();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const getCameraPermission = async () => {
      if (!open) return;

      setIsCameraInitializing(true);
      setHasCameraPermission(null); // Reset while checking
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      } finally {
        setIsCameraInitializing(false);
      }
    };

    if (open) {
      getCameraPermission();
    }

    return () => { // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
       setHasCameraPermission(null); // Reset permission status on close
    };
  }, [open, toast]);

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      onScanSuccess(orderId, scanPurpose);
      onOpenChange(false); 
      setIsScanning(false);
    }, 1000); 
  };

  const dialogTitle = scanPurpose === 'pickup' ? `Scan at Pickup: Order ${orderId}` : `Scan at Delivery: Order ${orderId}`;
  const dialogDescription = scanPurpose === 'pickup'
    ? 'Align the order barcode with the camera to confirm pickup from the vendor.'
    : 'Align the barcode (e.g., on the package or customer app) with the camera to confirm delivery.';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isScanning) return; // Prevent closing while "scan" is in progress
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden border">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            
            {isCameraInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                <Loader2 className="h-12 w-12 animate-spin mb-2" />
                <p>Initializing Camera...</p>
              </div>
            )}

            {!isCameraInitializing && hasCameraPermission === null && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                    <Camera className="h-12 w-12 mb-2" />
                    <p>Waiting for camera...</p>
                 </div>
            )}
            
            {!isCameraInitializing && hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/90 text-destructive-foreground p-4 text-center">
                <XCircle className="h-12 w-12 mb-2" />
                <p className="font-semibold">Camera Access Denied</p>
                <p className="text-sm">Please enable camera permissions in your browser settings and reopen this dialog.</p>
              </div>
            )}

            {hasCameraPermission === true && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-dashed border-primary opacity-75 rounded-lg animate-pulse" />
              </div>
            )}
          </div>

          {!isCameraInitializing && hasCameraPermission === false && (
            <Alert variant="destructive" className="mt-4">
              <Camera className="h-4 w-4" />
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Camera access is denied. You cannot use the scanner without it.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isScanning || isCameraInitializing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSimulateScan} 
            disabled={!hasCameraPermission || isScanning || isCameraInitializing} 
            className="bg-primary hover:bg-primary/80 w-36"
          >
            {isScanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 h-4 w-4" />
            )}
            {isScanning ? "Scanning..." : "Simulate Scan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
