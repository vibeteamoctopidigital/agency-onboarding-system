import { ClientOnboardingForm } from "@/features/onboarding/components/ClientOnboardingForm";

export default function ClientOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Let's Get Started
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-500 mx-auto">
          Complete this quick onboarding so we can understand your business and challenges perfectly.
        </p>
      </div>
      
      <ClientOnboardingForm />
    </div>
  );
}
