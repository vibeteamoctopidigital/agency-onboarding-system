import { toast as sonnerToast, ExternalToast } from "sonner";

/**
 * Custom toast wrapper that automatically splits messages containing " - "
 * into a Title and Description for a more professional, two-line layout.
 */
const processMessage = (msg: string | React.ReactNode) => {
  if (typeof msg === "string" && msg.includes(" - ")) {
    const parts = msg.split(" - ");
    const title = parts[0].trim();
    const description = parts.slice(1).join(" - ").trim();
    return { title, description };
  }
  return { title: msg, description: undefined };
};

export const toast = {
  ...sonnerToast,
  success: (msg: string | React.ReactNode, data?: ExternalToast) => {
    const { title, description } = processMessage(msg);
    return sonnerToast.success(title, { description, ...data });
  },
  error: (msg: string | React.ReactNode, data?: ExternalToast) => {
    const { title, description } = processMessage(msg);
    return sonnerToast.error(title, { description, ...data });
  },
  info: (msg: string | React.ReactNode, data?: ExternalToast) => {
    const { title, description } = processMessage(msg);
    return sonnerToast.info(title, { description, ...data });
  },
  warning: (msg: string | React.ReactNode, data?: ExternalToast) => {
    const { title, description } = processMessage(msg);
    return sonnerToast.warning(title, { description, ...data });
  },
};
