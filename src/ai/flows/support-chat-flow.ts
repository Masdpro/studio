
'use server';

/**
 * @fileOverview An AI flow to provide user support for the Closebuy app, specialized for the
 * Nigerian market. Beyond answering questions, it can search the product catalog and place a
 * real order on the signed-in customer's behalf — but only after they've explicitly confirmed
 * the exact items, delivery method, and total it proposed.
 *
 * This flow deliberately avoids Genkit/Gemini's native function-calling (the `tools` option):
 * @genkit-ai/googleai maps the 'tool' message role to the literal string 'function', which the
 * Gemini 3.x generation of models rejects outright (400 Bad Request) — and 2.x/2.5 models are no
 * longer reachable with newly created API keys. Instead, the model reports what it wants to do as
 * plain structured JSON (a normal, non-tool generate() call), and this flow runs the corresponding
 * function itself and feeds the result back in as a 'user' turn, looping until the model is ready
 * to reply. Only 'user' and 'model' roles are ever used, which every model generation accepts.
 *
 * - supportChat - A function that takes chat history and provides a helpful response.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProducts, getProductById } from '@/lib/services/products';
import { getVendorById } from '@/lib/services/vendors';
import { createOrder } from '@/lib/services/orders';
import type { ChatMessage, CartItem } from '@/lib/types';
import { ChatMessageSchema } from '@/lib/types';

const SupportChatInputSchema = z.array(ChatMessageSchema);

const AgentTurnSchema = z.object({
  toolCall: z
    .enum(['searchProducts', 'placeOrder', 'none'])
    .describe("'none' when ready to reply directly to the user."),
  searchQuery: z.string().optional().describe('Required when toolCall is "searchProducts".'),
  orderItems: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1) }))
    .optional()
    .describe('Required when toolCall is "placeOrder". Product ids must come from a prior searchProducts result.'),
  deliveryPreference: z.enum(['delivery', 'pickup']).optional().describe('Required when toolCall is "placeOrder".'),
  deliveryAddress: z
    .string()
    .optional()
    .describe('Required when toolCall is "placeOrder" and deliveryPreference is "delivery".'),
  reply: z.string().optional().describe('Your message to show the user. Required when toolCall is "none".'),
});
type AgentTurn = z.infer<typeof AgentTurnSchema>;

async function runSearchProducts(query: string) {
  const products = await getProducts();
  const q = query.toLowerCase();
  const matches = products
    .filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
    .slice(0, 5);

  return Promise.all(
    matches.map(async (p) => {
      const vendor = await getVendorById(p.vendorId);
      return {
        id: p.id,
        name: p.name,
        price: p.discountPrice ?? p.price,
        vendorId: p.vendorId,
        vendorName: vendor?.businessName ?? 'Unknown vendor',
      };
    })
  );
}

async function runPlaceOrder(input: {
  orderItems?: AgentTurn['orderItems'];
  deliveryPreference?: AgentTurn['deliveryPreference'];
  deliveryAddress?: string;
}) {
  const { orderItems, deliveryPreference, deliveryAddress } = input;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'customer') {
    return { success: false, error: 'The customer is not signed in with a customer account, so no order can be placed.' };
  }
  if (!orderItems?.length || !deliveryPreference) {
    return { success: false, error: 'Missing items or delivery preference.' };
  }
  if (deliveryPreference === 'delivery' && !deliveryAddress?.trim()) {
    return { success: false, error: 'A delivery address is required for delivery orders.' };
  }

  const itemsByVendor = new Map<string, CartItem[]>();
  for (const { productId, quantity } of orderItems) {
    const product = await getProductById(productId);
    if (!product) {
      return { success: false, error: `Product ${productId} does not exist. Search for it again.` };
    }
    const cartItem: CartItem = {
      productId: product.id,
      vendorId: product.vendorId,
      name: product.name,
      price: product.discountPrice ?? product.price,
      quantity,
      imageUrl: product.imageUrl,
    };
    if (!itemsByVendor.has(product.vendorId)) itemsByVendor.set(product.vendorId, []);
    itemsByVendor.get(product.vendorId)!.push(cartItem);
  }

  const orderIds: string[] = [];
  let totalAmount = 0;
  for (const [vendorId, vendorItems] of itemsByVendor) {
    const vendor = await getVendorById(vendorId);
    const itemsTotal = vendorItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = deliveryPreference === 'delivery' ? 1500 : 0;
    const orderId = await createOrder({
      customerId: session.user.id,
      vendorId,
      items: vendorItems,
      totalAmount: itemsTotal + deliveryFee,
      status: 'Pending',
      pickupAddress: vendor ? `${vendor.businessName}, ${vendor.streetAddress}, ${vendor.city}` : 'Vendor address unavailable',
      deliveryAddress: deliveryPreference === 'delivery' ? deliveryAddress! : 'Self-pickup',
      deliveryFee,
      deliveryPreference,
    });
    orderIds.push(orderId);
    totalAmount += itemsTotal + deliveryFee;
  }

  return { success: true, orderIds, totalAmount };
}

const SYSTEM_PROMPT = `You are an expert AI support agent for "Closebuy", an on-demand delivery app specialized for the Nigerian market. Your goal is to be friendly, concise, and helpful, guiding users on how to use the app's features within the context of local commerce (e.g., using Naira ₦, local markets like Balogun, and errand running).

Use the following information about the app's features to answer user questions. Do not make up features.

**Key App Features (Nigeria Context):**

**For Customers:**
- **Product Discovery:** Browse local items (Jollof, Yam, Ankara) on the homepage, filter by City (Lagos, Abuja, Enugu) or specific Market hubs.
- **Shopping Cart:** Add items, select "Delivery" (₦1,500 standard fee) or "Self-Pickup".
- **Order Tracking:** Monitor status from "Pending" to "Delivered".
- **Errand Requests:** Create a custom shopping list for items in open markets (e.g., "Get me 5kg of rice from Mile 12"). Specify items and a delivery address.
- **Viewing & Accepting Quotes:** For errands, agents will submit quotes in Naira (₦) including item cost and delivery fee.
- **User Wallet:** A Naira wallet to fund your account and pay for orders/errands.
- **Closebuy Vouchers:** Buy or redeem gift codes for credit.

**For Vendors:**
- **Dashboard:** Manage your local shop profile and inventory.
- **AI Inventory Scanner:** Scan Nigerian products (like a bag of rice or electronics) to auto-fill product details.
- **Market Listing:** Link your store to a major local market (e.g., Balogun Market) so customers can find you under the "Local Markets" tab.

**For Delivery Agents:**
- **Dashboard:** View available orders and errands in your city.
- **Submitting Quotes:** For errands, suggest a price based on your knowledge of local market prices.
- **Barcode Scanning:** Scan at the vendor and at the customer's gate/door to confirm status.
- **AI Route Optimization:** Optimize your bike route across multiple stops in busy cities like Lagos to save on petrol and time.

**Placing orders on the customer's behalf:**
Every reply you give is structured JSON with a "toolCall" field.
- Set toolCall to "searchProducts" (with searchQuery) to look up a product's exact id, current price, and vendor before proposing an order.
- Set toolCall to "placeOrder" (with orderItems built from ids returned by a prior searchProducts call, deliveryPreference, and deliveryAddress if delivering) ONLY after the customer has explicitly confirmed the exact items, quantities, delivery method, and total you presented to them in your immediately preceding reply. Never do this speculatively or on the first request — always show a summary and total in a "reply" first and wait for their next message to confirm it.
- Otherwise set toolCall to "none" and put your message to the customer in "reply".
After a successful placeOrder, tell the customer their order id(s) and total in your next reply, and that they can track it on the Orders page. If it fails (e.g. not signed in), explain why in plain language.`;

export async function supportChat(history: z.infer<typeof SupportChatInputSchema>): Promise<string> {
  const session = await getServerSession(authOptions);
  const authContext = session?.user
    ? `The user is currently signed in as a ${session.user.role}.`
    : 'The user is not signed in. Orders can only be placed for a signed-in customer — tell them to sign in first if they want to order.';

  // Gemini requires the conversation to start with a 'user' turn. The chat widget
  // seeds its UI with a canned opening greeting (role 'ai') before any real user
  // message exists, so drop any leading non-user turns before sending history.
  const firstUserIndex = history.findIndex((message) => message.role === 'user');
  const trimmedHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);

  let messages = trimmedHistory.map((message: ChatMessage) => ({
    role: message.role === 'ai' ? ('model' as const) : ('user' as const),
    content: message.content,
  }));

  for (let turn = 0; turn < 4; turn++) {
    const { output } = await ai.generate({
      // Pinned rather than using the app default (gemini-3.6-flash, ai/genkit.ts): this loop can
      // make several model calls per chat turn, and gemini-3.6-flash's free-tier quota is a very
      // tight 20 requests/day — gemini-3.5-flash has its own separate quota.
      model: 'googleai/gemini-3.5-flash',
      system: `${SYSTEM_PROMPT}\n\n${authContext}`,
      messages,
      output: { schema: AgentTurnSchema },
    });
    const decision = output!;

    if (decision.toolCall === 'none') {
      return decision.reply ?? "Sorry, I couldn't come up with a response. Please try again.";
    }

    messages = [...messages, { role: 'model' as const, content: [{ text: JSON.stringify(decision) }] }];

    if (decision.toolCall === 'placeOrder') {
      const result = await runPlaceOrder(decision);
      if (result.success) {
        // Report the outcome directly instead of spending another model call on it — placeOrder
        // is a one-shot side effect, so if a later call in this loop failed, the user would see
        // an error despite the order having already gone through, inviting a confused re-confirm
        // and a duplicate order.
        return `Your order has been placed! Order ID${result.orderIds!.length > 1 ? 's' : ''}: ${result.orderIds!.join(', ')}. Total: ₦${result.totalAmount!.toLocaleString()}. You can track it on the Orders page.`;
      }
      messages = [
        ...messages,
        { role: 'user' as const, content: [{ text: `[placeOrder result] ${JSON.stringify(result)}` }] },
      ];
      continue;
    }

    const searchResult = await runSearchProducts(decision.searchQuery ?? '');
    messages = [
      ...messages,
      { role: 'user' as const, content: [{ text: `[searchProducts result] ${JSON.stringify(searchResult)}` }] },
    ];
  }

  return "Sorry, I'm having trouble completing that request right now. Please try again.";
}
