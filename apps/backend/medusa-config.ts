const { loadEnv, defineConfig } = require("@medusajs/framework/utils");
const { resolveRedisConfiguration } = require("./src/config/redis");
const { resolveEnvironmentDirectory } = require("./src/config/environment");

loadEnv(process.env.NODE_ENV || "development", resolveEnvironmentDirectory(process.env, process.cwd()));

const { enabled: redisEnabled, redisUrl } = resolveRedisConfiguration(process.env);

// event-bus-redis is deliberately not configured here: it's built on
// BullMQ, whose worker runs continuous background maintenance (stalled-job
// checks, delayed-job scanning) on its own timer regardless of real event
// volume - confirmed live to fire every 1-2s even with zero traffic, which
// alone exhausted Upstash's request quota. Omitting it makes Medusa fall
// back to its default local (in-process EventEmitter) event bus - same
// subscribers, same notifications, no Redis involved. Trade-off: events
// aren't durable across a process restart, which is an acceptable trade
// for a single-instance deployment.
const redisModules = redisEnabled ? [
  {
    resolve: "@medusajs/medusa/cache-redis",
    options: { redisUrl, namespace: "begnon:" },
  },
  {
    resolve: "@medusajs/medusa/locking",
    options: {
      providers: [{
        resolve: "@medusajs/medusa/locking-redis",
        id: "locking-redis",
        options: { redisUrl, namespace: "begnon_lock:" },
      }],
    },
  },
] : [];

const notificationProviders = [
  ...(process.env.RESEND_API_KEY ? [{
    resolve: "./src/modules/resend-notification",
    id: "resend",
    options: {
      channels: ["email"],
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    },
  }] : []),
  ...(process.env.ARKESEL_API_KEY ? [{
    resolve: "./src/modules/arkesel-notification",
    id: "arkesel",
    options: {
      channels: ["sms"],
      apiKey: process.env.ARKESEL_API_KEY,
      sender: process.env.ARKESEL_SENDER_ID,
    },
  }] : []),
];

module.exports = defineConfig({
  admin: {
    disable: false,
    path: "/app",
    maxUploadFileSize: 10 * 1024 * 1024,
  },
  modules: [
    {
      resolve: "./src/modules/reviews",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/paystack-payment",
            id: "paystack",
            options: {
              secretKey: process.env.PAYSTACK_SECRET_KEY,
            },
          },
        ],
      },
    },
    ...(notificationProviders.length ? [{
      resolve: "@medusajs/medusa/notification",
      options: { providers: notificationProviders },
    }] : []),
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "r2",
            options: {
              file_url: process.env.R2_PUBLIC_URL,
              access_key_id: process.env.R2_ACCESS_KEY_ID,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
              region: "auto",
              bucket: process.env.R2_BUCKET_NAME,
              endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              acl: false,
            },
          },
        ],
      },
    },
    ...redisModules,
  ],
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA || "begnon",
    // Knex's own default (min:2, max:10) queues the 11th+ concurrent
    // DB-touching request instead of erroring, but 10 is low headroom given
    // each request holds its connection for a while (Supabase is remote,
    // ~150-200ms per round trip, and workflows like checkout make 15-20+
    // sequential queries). Safe to raise since this connects through
    // Supabase's transaction pooler (port 6543), not raw Postgres, so it
    // doesn't compete for Postgres's own low connection ceiling directly.
    // Supabase's transaction pooler presents a cert chain that Node's
    // default trust store won't validate even though sslmode=require is set
    // on the URL - connection is still encrypted, this only skips chain
    // verification (same effective trust level `uselibpqcompat`'s
    // `sslmode=require` already implies, matching everyday query traffic;
    // migration tooling's own DB client doesn't parse that URL flag the
    // same way and fails closed without this).
    databaseDriverOptions: { pool: { min: 2, max: 20 }, connection: { ssl: { rejectUnauthorized: false } } },
    ...(redisEnabled ? { redisUrl } : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  }
});
