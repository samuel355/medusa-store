import { fulfillmentWorker } from "@/workers/fulfillment";
import { notificationWorker } from "@/workers/notifications";

console.log("Begnon workers started: fulfillment, notifications");

async function shutdown(signal: string) {
  console.log(`Received ${signal}, closing workers...`);
  await Promise.all([fulfillmentWorker.close(), notificationWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
