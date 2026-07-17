import { getSql } from "@/lib/db/client";
import { type CartWithItems } from "@/lib/db/cart";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  placedAt: string;
  itemsSummary: string;
  itemCount: number;
};

export type OrderDetail = OrderSummary & {
  email: string;
  phone: string;
  shippingAddress: Record<string, unknown>;
  subtotal: number;
  shipping: number;
  items: { title: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[];
};

function generateOrderNumber() {
  const suffix = Math.floor(100 + Math.random() * 900);
  return `SOB-${Date.now().toString().slice(-8)}${suffix}`;
}

export async function createOrderFromCart(
  cart: CartWithItems,
  options: { customerId?: string; email: string; phone?: string; shippingAddress?: Record<string, unknown> },
) {
  const sql = getSql();

  return sql.begin(async (tx) => {
    const orderNumber = generateOrderNumber();
    const subtotalPesewas = Math.round(cart.totals.subtotal * 100);
    const shippingPesewas = Math.round(cart.totals.shipping * 100);
    const totalPesewas = Math.round(cart.totals.total * 100);

    const [order] = await tx<{ id: string; order_number: string }[]>`
      insert into medusastore.orders (
        order_number, customer_id, cart_id, email, phone,
        subtotal_amount, shipping_amount, total_amount, shipping_address
      ) values (
        ${orderNumber}, ${options.customerId ?? null}, ${cart.id}, ${options.email}, ${options.phone ?? null},
        ${subtotalPesewas}, ${shippingPesewas}, ${totalPesewas}, ${JSON.stringify(options.shippingAddress ?? {})}
      )
      returning id, order_number
    `;

    for (const item of cart.items) {
      const unitPricePesewas = Math.round(item.price * 100);
      const lineTotalPesewas = Math.round(item.lineTotal * 100);

      await tx`
        insert into medusastore.order_items (
          order_id, product_id, variant_id, title, sku, quantity, unit_price_amount, line_total_amount
        ) values (
          ${order.id}, ${item.productId}, ${item.variantId}, ${item.name}, ${null},
          ${item.quantity}, ${unitPricePesewas}, ${lineTotalPesewas}
        )
      `;
    }

    await tx`update medusastore.carts set status = 'converted' where id = ${cart.id}`;

    return { id: order.id, orderNumber: order.order_number, totalPesewas };
  });
}

export async function getOrdersForCustomer(customerId: string): Promise<OrderSummary[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      order_number: string;
      status: string;
      payment_status: string;
      fulfillment_status: string;
      total_amount: number;
      currency: string;
      placed_at: string;
      items_summary: string | null;
      item_count: string;
    }[]
  >`
    select
      o.id, o.order_number, o.status, o.payment_status, o.fulfillment_status,
      o.total_amount, o.currency, o.placed_at,
      string_agg(oi.title, ', ') as items_summary,
      count(oi.id) as item_count
    from medusastore.orders o
    left join medusastore.order_items oi on oi.order_id = o.id
    where o.customer_id = ${customerId}
    group by o.id
    order by o.placed_at desc
  `;

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    total: row.total_amount / 100,
    currency: row.currency,
    placedAt: row.placed_at,
    itemsSummary: row.items_summary ?? "",
    itemCount: Number(row.item_count),
  }));
}

export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const sql = getSql();
  const [order] = await sql<
    {
      id: string;
      order_number: string;
      status: string;
      payment_status: string;
      fulfillment_status: string;
      total_amount: number;
      subtotal_amount: number;
      shipping_amount: number;
      currency: string;
      placed_at: string;
      email: string | null;
      phone: string | null;
      shipping_address: Record<string, unknown>;
    }[]
  >`
    select * from medusastore.orders where id = ${orderId}
  `;
  if (!order) return null;

  const items = await sql<
    { title: string; sku: string | null; quantity: number; unit_price_amount: number; line_total_amount: number }[]
  >`
    select title, sku, quantity, unit_price_amount, line_total_amount
    from medusastore.order_items where order_id = ${orderId}
  `;

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    total: order.total_amount / 100,
    subtotal: order.subtotal_amount / 100,
    shipping: order.shipping_amount / 100,
    currency: order.currency,
    placedAt: order.placed_at,
    email: order.email ?? "",
    phone: order.phone ?? "",
    shippingAddress: order.shipping_address ?? {},
    itemsSummary: items.map((item) => item.title).join(", "),
    itemCount: items.length,
    items: items.map((item) => ({
      title: item.title,
      sku: item.sku ?? "",
      quantity: item.quantity,
      unitPrice: item.unit_price_amount / 100,
      lineTotal: item.line_total_amount / 100,
    })),
  };
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderDetail | null> {
  const sql = getSql();
  const [order] = await sql<{ id: string }[]>`
    select id from medusastore.orders where order_number = ${orderNumber}
  `;

  return order ? getOrderById(order.id) : null;
}

export async function getOrderItemsForReorder(orderId: string) {
  const sql = getSql();
  return sql<{ variant_id: string | null; quantity: number }[]>`
    select variant_id, quantity from medusastore.order_items where order_id = ${orderId} and variant_id is not null
  `;
}

export async function cancelOrder(orderId: string, customerId: string) {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    update medusastore.orders set status = 'cancelled'
    where id = ${orderId} and customer_id = ${customerId} and status in ('pending', 'confirmed')
    returning id
  `;

  return rows.length > 0;
}

export async function listAllOrders(): Promise<OrderSummary[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      order_number: string;
      status: string;
      payment_status: string;
      fulfillment_status: string;
      total_amount: number;
      currency: string;
      placed_at: string;
      items_summary: string | null;
      item_count: string;
    }[]
  >`
    select
      o.id, o.order_number, o.status, o.payment_status, o.fulfillment_status,
      o.total_amount, o.currency, o.placed_at,
      string_agg(oi.title, ', ') as items_summary,
      count(oi.id) as item_count
    from medusastore.orders o
    left join medusastore.order_items oi on oi.order_id = o.id
    group by o.id
    order by o.placed_at desc
    limit 200
  `;

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    total: row.total_amount / 100,
    currency: row.currency,
    placedAt: row.placed_at,
    itemsSummary: row.items_summary ?? "",
    itemCount: Number(row.item_count),
  }));
}

export async function updateOrderStatus(
  orderId: string,
  patch: { status?: string; fulfillmentStatus?: string },
) {
  const sql = getSql();
  await sql`
    update medusastore.orders set
      status = coalesce(${patch.status ?? null}, status),
      fulfillment_status = coalesce(${patch.fulfillmentStatus ?? null}, fulfillment_status)
    where id = ${orderId}
  `;
}
