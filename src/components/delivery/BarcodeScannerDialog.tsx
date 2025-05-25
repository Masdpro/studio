
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

export type ScanPurpose = 'pickup' | 'delivery' | 'customer_pickup';

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  scanPurpose: ScanPurpose;
  onScanSuccess: (orderId: string, purpose: ScanPurpose) => void;
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  orderId,
  scanPurpose,
  onScanSuccess,
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // Use ref to manage stream across renders and effects
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!open) return;

      setIsCameraInitializing(true);
      setHasCameraPermission(null);
      let newStream: MediaStream | null = null;

      try {
        // Attempt 1: Environment (rear) camera
        console.log('Attempting to access rear (environment) camera...');
        newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        console.log('Rear camera accessed.');
      } catch (rearError) {
        console.warn('Rear camera access failed:', rearError);
        try {
          // Attempt 2: Any available camera (fallback, likely front)
          console.log('Attempting to access any available camera (fallback)...');
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log('Fallback camera accessed.');
        } catch (anyError) {
          console.error('Error accessing any camera:', anyError);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Could not access any camera. Please enable camera permissions in your browser settings.',
          });
          setIsCameraInitializing(false);
          return; 
        }
      }

      streamRef.current = newStream; // Store the stream in the ref
      setHasCameraPermission(true);
      if (videoRef.current && newStream) {
        videoRef.current.srcObject = newStream;
      }
      setIsCameraInitializing(false);
    };

    if (open) {
      getCameraPermission();
    }

    return () => { // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setHasCameraPermission(null);
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

  let dialogTitleText = '';
  let dialogDescriptionText = '';

  switch (scanPurpose) {
    case 'pickup':
      dialogTitleText = `Scan at Vendor Pickup: Order ${orderId}`;
      dialogDescriptionText = 'Align the order barcode with the camera to confirm pickup from the vendor.';
      break;
    case 'delivery':
      dialogTitleText = `Scan at Customer Delivery: Order ${orderId}`;
      dialogDescriptionText = 'Align the barcode (e.g., on the package or customer app) with the camera to confirm delivery.';
      break;
    case 'customer_pickup':
      dialogTitleText = `Scan to Confirm Self-Pickup: Order ${orderId}`;
      dialogDescriptionText = 'Align the barcode provided by the vendor with the camera to confirm your pickup.';
      break;
    default:
      dialogTitleText = `Scan Order ${orderId}`;
      dialogDescriptionText = 'Align the barcode with the camera.';
  }


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isScanning) return; 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" />
            {dialogTitleText}
          </DialogTitle>
          <DialogDescription>{dialogDescriptionText}</DialogDescription>
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

