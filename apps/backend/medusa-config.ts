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
