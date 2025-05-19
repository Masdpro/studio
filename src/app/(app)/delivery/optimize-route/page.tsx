'use client';

import { useState } from 'react';
import { RouteOptimizationForm, type RouteOptimizationFormValues } from '@/components/delivery/RouteOptimizationForm';
import { RouteOptimizationResult } from '@/components/delivery/RouteOptimizationResult';
import { optimizeDeliveryRoute, type OptimizeDeliveryRouteInput, type OptimizeDeliveryRouteOutput } from '@/ai/flows/optimize-delivery-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RouteOptimizationPage() {
  const [optimizationResult, setOptimizationResult] = useState<OptimizeDeliveryRouteOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (data: OptimizeDeliveryRouteInput) => {
    setIsLoading(true);
    setError(null);
    setOptimizationResult(null);
    try {
      const result = await optimizeDeliveryRoute(data);
      setOptimizationResult(result);
      toast({
        title: 'Route Optimized!',
        description: 'The optimal delivery route has been generated.',
      });
    } catch (err) {
      console.error('Error optimizing route:', err);
      let errorMessage = 'Failed to optimize route. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Route Optimization Tool
          </CardTitle>
          <CardDescription>
            Enter delivery details to find the most efficient route using our AI-powered optimizer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RouteOptimizationForm onSubmit={handleSubmit} isLoading={isLoading} />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-8 max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Optimization Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="mt-8 text-center max-w-2xl mx-auto">
          <div className="flex justify-center items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-lg text-muted-foreground">Optimizing your route, please wait...</p>
          </div>
        </div>
      )}

      {optimizationResult && !isLoading && (
        <RouteOptimizationResult result={optimizationResult} />
      )}
    </div>
  );
}
