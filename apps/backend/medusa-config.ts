const { loadEnv, defineConfig } = require("@medusajs/framework/utils");
const { resolveRedisConfiguration } = require("./src/config/redis");
const { resolveEnvironmentDirectory } = require("./src/config/environment");

loadEnv(process.env.NODE_ENV || "development", resolveEnvironmentDirectory(process.env, process.cwd()));

const { enabled: redisEnabled, redisUrl } = resolveRedisConfiguration(process.env);

const redisModules = redisEnabled ? [
  {
    resolve: "@medusajs/medusa/event-bus-redis",
    options: { redisUrl, queueName: "begnon-events" },
  },
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
    databaseSchema: process.env.DATABASE_SCHEMA || "medusastore",
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
