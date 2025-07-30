'use server';

/**
 * @fileOverview An AI flow to identify products from an image.
 *
 * - identifyProductFromImage - A function that analyzes an image and returns details about the product(s) it contains.
 * - IdentifyProductInput - The input type for the identifyProductFromImage function.
 * - IdentifyProductOutput - The return type for the identifyProductFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyProductInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyProductInput = z.infer<typeof IdentifyProductInputSchema>;

const IdentifiedProductSchema = z.object({
  name: z.string().describe('The name of the identified product.'),
  description: z.string().describe('A detailed description of the product.'),
  category: z.string().describe('A suggested category for the product (e.g., Electronics, Apparel, Groceries).'),
  aiHint: z.string().describe("Two keywords for AI image generation or search, separated by a space (e.g., 'book novel')."),
});

const IdentifyProductOutputSchema = z.object({
    products: z.array(IdentifiedProductSchema).describe('An array of products identified in the image.')
});
export type IdentifyProductOutput = z.infer<typeof IdentifyProductOutputSchema>;


export async function identifyProductFromImage(input: IdentifyProductInput): Promise<IdentifyProductOutput> {
  return identifyProductFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyProductPrompt',
  input: {schema: IdentifyProductInputSchema},
  output: {schema: IdentifyProductOutputSchema},
  prompt: `You are an expert product cataloger. Your task is to identify the product(s) in the provided image.

For each product you identify, provide the following details:
- A concise and accurate 'name'.
- A compelling 'description' suitable for an e-commerce listing.
- A single, relevant 'category' from a standard e-commerce taxonomy (e.g., Electronics, Apparel, Books, Groceries, Furniture, Sports).
- An 'aiHint' consisting of exactly two descriptive keywords for image search.

If there are multiple distinct products, return an entry for each one in the 'products' array. If there are no identifiable products, return an empty array.

Photo: {{media url=photoDataUri}}`,
});

const identifyProductFlow = ai.defineFlow(
  {
    name: 'identifyProductFlow',
    inputSchema: IdentifyProductInputSchema,
    outputSchema: IdentifyProductOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
