import { redirect } from "next/navigation"

// Media storage is managed from the admin dashboard's "Media storage" button -
// this stub must not ship as an unguarded public page.
export default function Page() {
  redirect("/admin/dashboard")
}
