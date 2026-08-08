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
    select c.* from medusastore.customers c
    join medusastore.customer_auth_identities i on i.customer_id = c.id
    where i.auth_user_id = ${authUserId}
  `;

  return rows[0] ? mapCustomer(rows[0]) : null;
}

// Only identifiers Supabase has itself confirmed for this specific auth
// user are trusted for account matching - an unverified email/phone claim
// must never be able to attach to someone else's existing customer record.
async function getVerifiedIdentifiers(sql: ReturnType<typeof getSql>, authUserId: string) {
  const [row] = await sql<{
    email: string | null;
    email_confirmed_at: Date | null;
    phone: string | null;
    phone_confirmed_at: Date | null;
  }[]>`
    select email, email_confirmed_at, phone, phone_confirmed_at from auth.users where id = ${authUserId}
  `;

  return {
    verifiedEmail: row?.email_confirmed_at ? row.email : null,
    verifiedPhone: row?.phone_confirmed_at ? row.phone : null,
  };
}

// A person may sign in via email/password, Google, and phone OTP - each
// creates a separate auth.users row, so this links a new one to whichever
// existing customer already owns that (verified) email or phone instead of
// creating a duplicate, which would otherwise hit the unique constraints on
// customers.email/phone with a raw, unhandled conflict.
export async function ensureCustomerForAuthUser(input: {
  authUserId: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
}): Promise<Customer> {
  const sql = getSql();

  const existing = await getCustomerByAuthUserId(input.authUserId);
  if (existing) return existing;

  const { verifiedEmail, verifiedPhone } = await getVerifiedIdentifiers(sql, input.authUserId);

  if (verifiedEmail || verifiedPhone) {
    const [match] = await sql<CustomerRow[]>`
      select * from medusastore.customers
      where (${verifiedEmail}::text is not null and email = ${verifiedEmail})
         or (${verifiedPhone}::text is not null and phone = ${verifiedPhone})
      limit 1
    `;

    if (match) {
      await sql`
        insert into medusastore.customer_auth_identities (auth_user_id, customer_id)
        values (${input.authUserId}, ${match.id})
        on conflict (auth_user_id) do nothing
      `;
      const [updated] = await sql<CustomerRow[]>`
        update medusastore.customers set
          email = coalesce(email, ${verifiedEmail}),
          phone = coalesce(phone, ${verifiedPhone})
        where id = ${match.id}
        returning *
      `;
      return mapCustomer(updated);
    }
  }

  const [created] = await sql<CustomerRow[]>`
    insert into medusastore.customers (auth_user_id, email, phone, display_name)
    values (${input.authUserId}, ${input.email ?? null}, ${input.phone ?? null}, ${input.displayName ?? input.email ?? input.phone ?? null})
    returning *
  `;
  await sql`
    insert into medusastore.customer_auth_identities (auth_user_id, customer_id)
    values (${input.authUserId}, ${created.id})
  `;

  return mapCustomer(created);
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
