export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">{children}</div>
    </div>
  )
}
