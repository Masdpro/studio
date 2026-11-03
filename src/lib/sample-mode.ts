/**
 * When a table is empty, development shows built-in sample shops, products and
 * markets so the app isn't blank. On the live site that would show fake items
 * people could try to buy, so it's off in production unless USE_SAMPLE_DATA=true.
 */
export const useSampleData = process.env.NODE_ENV !== 'production' || process.env.USE_SAMPLE_DATA === 'true';
