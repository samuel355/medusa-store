import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getActiveCart, getCartWithItems, addCartItem, updateCartItemQuantity, removeCartItem } from "@/lib/db/cart";
import { hasAuthSessionCookie, resolveCustomerId } from "@/lib/auth/session";

const CART_COOKIE = "begnon_cart_id";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

async function readCartId() {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE)?.value;
}

async function withCartCookie(cartId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export async function GET() {
  const cartId = await readCartId();
  const customerId = (await hasAuthSessionCookie()) ? await resolveCustomerId() : undefined;

  if (!cartId && !customerId) {
    return NextResponse.json({ id: null, items: [], totals: { quantity: 0, subtotal: 0, shipping: 0, total: 0 } });
  }

  const resolvedCartId = await getActiveCart(cartId, customerId);
  await withCartCookie(resolvedCartId);

  return NextResponse.json(await getCartWithItems(resolvedCartId));
}

export async function POST(request: Request) {
  const body = (await request.json()) as { variantId?: string; quantity?: number };
  if (!body.variantId) {
    return NextResponse.json({ error: "variantId is required." }, { status: 400 });
  }

  const cartId = await readCartId();
  const customerId = (await hasAuthSessionCookie()) ? await resolveCustomerId() : undefined;
  const resolvedCartId = await getActiveCart(cartId, customerId);

  await addCartItem(resolvedCartId, body.variantId, body.quantity ?? 1);
  await withCartCookie(resolvedCartId);

  return NextResponse.json(await getCartWithItems(resolvedCartId));
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { itemId?: string; quantity?: number };
  const cartId = await readCartId();

  if (!body.itemId || typeof body.quantity !== "number" || !cartId) {
    return NextResponse.json({ error: "itemId, quantity and an active cart are required." }, { status: 400 });
  }

  await updateCartItemQuantity(cartId, body.itemId, body.quantity);

  return NextResponse.json(await getCartWithItems(cartId));
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { itemId?: string };
  const cartId = await readCartId();

  if (!body.itemId || !cartId) {
    return NextResponse.json({ error: "itemId and an active cart are required." }, { status: 400 });
  }

  await removeCartItem(cartId, body.itemId);

  return NextResponse.json(await getCartWithItems(cartId));
}
