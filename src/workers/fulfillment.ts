import { Worker } from "bullmq";
import IORedis from "ioredis";
import { readEnv } from "@/lib/env";
import { updateOrderStatus } from "@/lib/db/orders";

const connection = new IORedis(readEnv("REDIS_URL"), {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const fulfillmentWorker = new Worker(
  "fulfillment",
  async (job) => {
    if (job.name === "order.paid") {
      await updateOrderStatus(job.data.orderId, { fulfillmentStatus: "queued" });
      return { orderId: job.data.orderId, status: "queued_for_fulfillment" };
    }
  },
  { connection }
);

fulfillmentWorker.on("completed", (job) => {
  console.log(`[fulfillment] job ${job.id} (${job.name}) completed`, job.returnvalue);
});

fulfillmentWorker.on("failed", (job, error) => {
  console.error(`[fulfillment] job ${job?.id} (${job?.name}) failed`, error);
});
