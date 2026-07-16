import { Resend } from "resend";
import { env } from "../../utils/envConfig";

// Ensure RESEND_API_KEY is available in process.env
const apiKey = process.env.RESEND_API_KEY || "";
export const resend = new Resend(apiKey);
