import { Worker } from "bullmq";
import IORedis from "ioredis";
import { readEnv } from "@/lib/env";

const connection = new IORedis(readEnv("REDIS_URL"), {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const fulfillmentWorker = new Worker(
  "fulfillment",
  async (job) => {
    if (job.name === "order.paid") {
      // Connect this to Medusa order fulfillment or a custom warehouse workflow.
      return { orderId: job.data.orderId, status: "queued_for_fulfillment" };
    }
  },
  { connection }
);
