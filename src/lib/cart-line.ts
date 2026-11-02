/** A cart line is a product plus the colour/size picked, so two sizes of one product stay separate lines. */
export const cartLineKey = (i: { productId: string; color?: string; size?: string }) =>
  [i.productId, i.color ?? '', i.size ?? ''].join('|');
