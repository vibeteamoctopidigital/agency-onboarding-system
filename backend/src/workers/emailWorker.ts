import { Worker, Job } from "bullmq";
import { buildTemplateData, EMAIL_CONFIG, EmailJobName, getRecipientEmail, renderTemplate, sendEmail } from "../utils/email.utils";
import { redis } from "../config/redis";




const emailWorker = new Worker(
  "emailQueue",
  async (job: Job) => {
    const config = EMAIL_CONFIG[job.name as EmailJobName];
    if (!config) {
      console.warn(`No config for job: ${job.name}`);
      return;
    }
    try {
      // 1. Prepare data
      const templateData = buildTemplateData(job.name as EmailJobName, job.data);
      console.log(job.name,job.data);
      
      console.log(templateData);
      
      // // 2. Render template
      const html = await renderTemplate(config.template, templateData);
      // // 3. Get recipient
      const email = getRecipientEmail(job.data);
      if (!email) {
        throw new Error("Recipient email not found");
      }
      // // 4. Send email
      await sendEmail({
        email,
        subject: config.subject,
        html,
        type: job.name as any,
      });
    } catch (error) {
      console.error(`Error processing [${job.name}]`, error);
      throw error;
    }
  },
  {
    connection: redis as any,
  }
);

// Events
emailWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} [${job.name}] completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} [${job?.name}] failed:`, err);
});

export default emailWorker;