import { getSql } from "@/lib/db/client";

export type Customer = {
  id: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  tier: string;
  rewardPoints: number;
  createdAt: string;
};

type CustomerRow = {
  id: string;
  auth_user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  customer_tier: string;
  reward_points: number;
  created_at: string;
};

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    displayName: row.display_name ?? row.email ?? row.phone ?? "Customer",
    email: row.email ?? "",
    phone: row.phone ?? "",
    avatarUrl: row.avatar_url ?? "",
    tier: row.customer_tier,
    rewardPoints: row.reward_points,
    createdAt: row.created_at,
  };
}

export async function getCustomerByAuthUserId(authUserId: string): Promise<Customer | null> {
  const sql = getSql();
  const rows = await sql<CustomerRow[]>`
    select * from medusastore.customers where auth_user_id = ${authUserId}
  `;

  return rows[0] ? mapCustomer(rows[0]) : null;
}

export async function ensureCustomerForAuthUser(input: {
  authUserId: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
}): Promise<Customer> {
  const sql = getSql();
  const rows = await sql<CustomerRow[]>`
    insert into medusastore.customers (auth_user_id, email, phone, display_name)
    values (${input.authUserId}, ${input.email ?? null}, ${input.phone ?? null}, ${input.displayName ?? input.email ?? input.phone ?? null})
    on conflict (auth_user_id) do update set
      email = coalesce(excluded.email, medusastore.customers.email),
      phone = coalesce(excluded.phone, medusastore.customers.phone)
    returning *
  `;

  return mapCustomer(rows[0]);
}

export async function updateCustomerProfile(
  customerId: string,
  patch: Partial<Pick<Customer, "firstName" | "lastName" | "displayName" | "phone" | "email">>,
): Promise<Customer> {
  const sql = getSql();
  const rows = await sql<CustomerRow[]>`
    update medusastore.customers set
      first_name = coalesce(${patch.firstName ?? null}, first_name),
      last_name = coalesce(${patch.lastName ?? null}, last_name),
      display_name = coalesce(${patch.displayName ?? null}, display_name),
      phone = coalesce(${patch.phone ?? null}, phone),
      email = coalesce(${patch.email ?? null}, email)
    where id = ${customerId}
    returning *
  `;

  return mapCustomer(rows[0]);
}

export async function isAdminAuthUser(authUserId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    select id from medusastore.admin_users where auth_user_id = ${authUserId} and is_active = true
  `;

  return rows.length > 0;
}
