"use client"

import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppShell } from "@/components/layouts/AppShell"
import { useAuth } from "@/hooks/auth/useAuth"
import { UserCircle, Mail, MapPin, Building2 } from "lucide-react"

function ClientProfile() {
  const { user } = useAuth()

  return (
    <AppShell
      title="My Profile"
      subtitle="View your account details and settings."
    >
      <div className="max-w-2xl mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <div className="px-8 pb-8 relative">
            {/* Avatar */}
            <div className="absolute -top-12 left-8">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400 shadow-md">
                {user?.initials || <UserCircle className="w-12 h-12" />}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end pt-4 mb-6">
              <button disabled className="text-[13px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg cursor-not-allowed">
                Edit Profile
              </button>
            </div>
            
            {/* Profile Info */}
            <div className="mt-2">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-sm font-medium text-blue-600 mt-1 flex items-center gap-1">
                <Building2 className="w-4 h-4" /> {user?.agencyName || "Agency Client"}
              </p>
            </div>
            
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-3">Contact Information</h3>
                <div className="grid gap-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400">Email Address</p>
                      <p className="font-medium text-gray-900">{user?.email || user?.contactEmail || "No email provided"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400">Location ID</p>
                      <p className="font-medium text-gray-900">{user?.locationId || "Not assigned"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard allowedRoles={["SUB_ACCOUNT"]} redirectTo="/login">
      <ClientProfile />
    </AuthGuard>
  )
}
