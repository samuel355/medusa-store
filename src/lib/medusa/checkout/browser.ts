export async function finalizeVerifiedCheckout<TOrder extends { id: string }>(input: {
  cartId: string;
  waitUntilPaid(cartId: string): Promise<unknown>;
  complete(cartId: string): Promise<TOrder>;
  resetAfterCheckout(): Promise<unknown>;
  clearPending(): void;
  redirect(orderId: string): void;
}) {
  await input.waitUntilPaid(input.cartId);
  const order = await input.complete(input.cartId);
  input.clearPending();
  await input.resetAfterCheckout();
  input.redirect(order.id);
  return order;
}
