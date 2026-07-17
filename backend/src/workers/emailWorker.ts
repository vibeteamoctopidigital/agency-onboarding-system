const emailWorker = {
  on: (event: string, callback: any) => {
    console.log(`[MOCK EMAIL WORKER] Registered event: ${event}`);
  }
} as any;

export default emailWorker;