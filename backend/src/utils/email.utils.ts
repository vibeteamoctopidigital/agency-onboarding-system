import ejs from "ejs";
import path from "path";
import { resend } from "../lib/email/resend.client";
import { pino } from "pino";
import { env } from "./envConfig";
import axios from "axios";
import { AppError } from "./appError";

const logger = pino({ name: "email" });

export type EmailJobName = "PROPOSAL_SENT" | "PROPOSAL_APPROVED" | "TICKET_SUBMITTED";

export const EMAIL_CONFIG: Record<EmailJobName, { subject: string; template: string }> = {
  PROPOSAL_SENT: {
    subject: "New Order Proposal Received",
    template: "proposal-sent-email.ejs",
  },
  PROPOSAL_APPROVED: {
    subject: "Order Proposal Approved",
    template: "proposal-approved-email.ejs",
  },
  TICKET_SUBMITTED: {
    subject: "New Ticket Submitted",
    template: "ticket-submit-email.ejs",
  },
};

export function buildTemplateData(jobName: EmailJobName, data: any) {
  // Pass through all data to the template
  return { ...data, appBaseUrl: env.CORS_ORIGIN || "http://localhost:3000" };
}

export async function renderTemplate(templateName: string, data: any): Promise<string> {
  const templatePath = path.join(process.cwd(), "src", "templates", templateName);
  try {
    return await ejs.renderFile(templatePath, data, { async: true });
  } catch (err) {
    logger.error({ err, templateName }, "Failed to render email template");
    throw err;
  }
}

export function getRecipientEmail(data: any): string | null {
  return data.email || data.to || null;
}

export async function sendEmail({ email, subject, html, type }: { email: string; subject: string; html: string; type: string }) {
  const from = env.EMAIL_FROM || "Octopi Support <noreply@octopidigital.com>";
  
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject,
      html,
    });
    
    if (error) {
      logger.error({ err: error, to: email, subject, type }, "Resend email send failed");
      throw new Error(`Resend Error: ${error.message}`);
    }
    
    logger.info({ to: email, subject, type, id: data?.id }, "Resend email sent successfully");
    return data;
  } catch (error) {
    logger.error({ err: error, to: email, subject, type }, "Failed to send email via Resend");
    throw error; // Re-throw so BullMQ can retry
  }
}


export const sendMailByWebHook = async (payload:any)=>{

      if(!env.GHL_EMAIL_SEND_WEBHOOK_URL){
        throw new AppError(`GHL_EMAIL_SEND_WEBHOOK_URL is Requried`)
      }

  try {
      const response = await  axios.post(env.GHL_EMAIL_SEND_WEBHOOK_URL,{
          ...payload
        });

        if(response.status === 200) return true
  } catch (error:any) {
        return {
          success:false,
          message:error?.messsage
        }
  }

}