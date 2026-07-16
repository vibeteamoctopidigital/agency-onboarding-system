import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const emailQueue = new Queue("emailQueue", {
  connection: redis as any,
});

// ✅ Job waiting in queue
emailQueue.on("waiting", (jobId) => {
  console.log(`🕒 Job ${jobId} is waiting in the queue`);
});