/** Runs once when the server starts. Starts the quarterly update of Quick add's suggested prices. */
export async function register() {
  // Written this way so the Node-only code is left out of the edge (middleware) build.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPriceSchedule } = await import('./lib/services/catalog-prices');
    startPriceSchedule();
  }
}
