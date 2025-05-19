import type { OptimizeDeliveryRouteOutput } from '@/ai/flows/optimize-delivery-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListOrdered, Clock, Waypoints } from 'lucide-react';

interface RouteOptimizationResultProps {
  result: OptimizeDeliveryRouteOutput;
}

export function RouteOptimizationResult({ result }: RouteOptimizationResultProps) {
  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Waypoints className="h-6 w-6 text-primary" />
          Optimized Delivery Route
        </CardTitle>
        <CardDescription>Here is the most efficient route based on your inputs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
            <ListOrdered className="h-5 w-5 text-accent" />
            Route Order:
          </h3>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            {result.optimizedRoute.map((location, index) => (
              <li key={index} className="text-md">{location}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-accent" />
            Estimated Travel Time:
          </h3>
          <p className="text-md">{result.estimatedTravelTime}</p>
        </div>
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
            Instructions:
          </h3>
          <p className="text-md whitespace-pre-line bg-muted p-4 rounded-md">{result.instructions}</p>
        </div>
      </CardContent>
    </Card>
  );
}
