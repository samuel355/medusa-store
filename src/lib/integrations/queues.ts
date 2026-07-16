import { Queue } from "bullmq";
import IORedis from "ioredis";
import { readEnv } from "@/lib/env";

let connection: IORedis | undefined;
let queues: { fulfillmentQueue: Queue; notificationQueue: Queue } | undefined;

function getConnection() {
  connection ??= new IORedis(readEnv("REDIS_URL"), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  return connection;
}

export function getQueues() {
  queues ??= {
    fulfillmentQueue: new Queue("fulfillment", { connection: getConnection() }),
    notificationQueue: new Queue("notifications", { connection: getConnection() })
  };

  return queues;
}

export async function enqueueOrderPaid(orderId: string, phone?: string) {
  const { fulfillmentQueue, notificationQueue } = getQueues();

  await fulfillmentQueue.add("order.paid", { orderId }, { attempts: 5, backoff: { type: "exponential", delay: 5000 } });

  if (phone) {
    await notificationQueue.add(
      "sms.order_paid",
      { orderId, phone },
      { attempts: 5, backoff: { type: "exponential", delay: 3000 } }
    );
  }
}
