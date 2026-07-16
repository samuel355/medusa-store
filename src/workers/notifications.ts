import { Worker } from "bullmq";
import IORedis from "ioredis";
import { sendSms } from "@/lib/integrations/arkesel";
import { readEnv } from "@/lib/env";

const connection = new IORedis(readEnv("REDIS_URL"), {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "sms.order_paid") {
      await sendSms({
        to: job.data.phone,
        message: `Your Ember order ${job.data.orderId} has been paid. We will send delivery updates shortly.`
      });
    }
  },
  { connection }
);
