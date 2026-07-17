export const emailQueue = {
  add: async (name: string, data: any) => {
    console.log(`[MOCK EMAIL QUEUE] Added job: ${name}`, data);
  },
  on: (event: string, callback: any) => {
    console.log(`[MOCK EMAIL QUEUE] Registered event: ${event}`);
  }
} as any;