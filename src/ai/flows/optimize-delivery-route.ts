'use server';

/**
 * @fileOverview Optimizes delivery routes based on real-time traffic, delivery locations, and time windows.
 *
 * - optimizeDeliveryRoute - A function that suggests the most efficient delivery route.
 * - OptimizeDeliveryRouteInput - The input type for the optimizeDeliveryRoute function.
 * - OptimizeDeliveryRouteOutput - The return type for the optimizeDeliveryRoute function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeDeliveryRouteInputSchema = z.object({
  startLocation: z
    .string()
    .describe('The starting location for the delivery route.'),
  deliveryLocations: z
    .array(z.string())
    .describe('An array of delivery locations for the route.'),
  timeWindows: z
    .array(z.object({
      location: z.string(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
    }))
    .describe('An array of time windows for each delivery location.'),
  currentTrafficConditions: z
    .string()
    .describe('A description of current traffic conditions.'),
});
export type OptimizeDeliveryRouteInput = z.infer<typeof OptimizeDeliveryRouteInputSchema>;

const OptimizeDeliveryRouteOutputSchema = z.object({
  optimizedRoute: z
    .array(z.string())
    .describe('An array of locations representing the optimized delivery route.'),
  estimatedTravelTime: z
    .string()
    .describe('The estimated total travel time for the optimized route.'),
  instructions: z.string().describe('Step by step instructions for the route.'),
});
export type OptimizeDeliveryRouteOutput = z.infer<typeof OptimizeDeliveryRouteOutputSchema>;

export async function optimizeDeliveryRoute(input: OptimizeDeliveryRouteInput): Promise<OptimizeDeliveryRouteOutput> {
  return optimizeDeliveryRouteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeDeliveryRoutePrompt',
  input: {schema: OptimizeDeliveryRouteInputSchema},
  output: {schema: OptimizeDeliveryRouteOutputSchema},
  prompt: `You are a route optimization expert.

  Given the following delivery locations, time windows, and current traffic conditions, suggest the most efficient delivery route to minimize travel time.

  Start Location: {{{startLocation}}}
  Delivery Locations: {{#each deliveryLocations}}{{{this}}}, {{/each}}
  Time Windows: {{#each timeWindows}}Location: {{{this.location}}}, Start Time: {{{this.startTime}}}, End Time: {{{this.endTime}}}. {{/each}}
  Current Traffic Conditions: {{{currentTrafficConditions}}}

  Consider all factors and provide an optimized route, estimated travel time, and step-by-step instructions.

  Format the locations in the "optimizedRoute" as an array of strings.
  `,
});

const optimizeDeliveryRouteFlow = ai.defineFlow(
  {
    name: 'optimizeDeliveryRouteFlow',
    inputSchema: OptimizeDeliveryRouteInputSchema,
    outputSchema: OptimizeDeliveryRouteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
