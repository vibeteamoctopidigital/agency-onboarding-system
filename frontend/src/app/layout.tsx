import { Orbitron, Space_Grotesk } from "next/font/google"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
})

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
})

import type { Metadata } from "next"
import { Toaster } from "sonner"
import QueryProvider from "@/providers/QueryProvider"
import ReduxProvider from "@/providers/ReduxProvider"
import ThemeProvider from "@/providers/ThemeProvider"

export const metadata: Metadata = {
  title: "Agency Dashboard",
  description: "Enterprise agency management system",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${orbitron.variable} font-sans antialiased`}
      >
        <ReduxProvider>
          <QueryProvider>
            <div className="flex-1 overflow-auto bg-gray-50 flex flex-col min-h-screen">
              <ThemeProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    classNames: {
                      toast: "group flex items-start w-full p-3 px-4 rounded-lg border-[1px] shadow-sm",
                      title: "text-[15px] font-semibold leading-tight",
                      description: "text-[14px] mt-0.5 opacity-90",
                      success: "border-green-500 bg-[#f0fdf4] text-green-700",
                      error: "border-red-500 bg-red-50 text-red-700",
                      info: "border-blue-500 bg-blue-50 text-blue-700",
                      warning: "border-amber-500 bg-amber-50 text-amber-700",
                      icon: "w-5 h-5 mt-0.5 mr-2",
                      closeButton: "opacity-0 group-hover:opacity-100 transition-opacity !bg-transparent !border-none !text-gray-500 hover:!text-gray-900 right-2 top-2",
                    }
                  }}
                />
              </ThemeProvider>
            </div>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
