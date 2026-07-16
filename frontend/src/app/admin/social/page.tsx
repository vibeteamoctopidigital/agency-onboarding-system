import { redirect } from "next/navigation"

// The social app moved to its own area - /social/admin - with the same session.
export default function Page() {
  redirect("/social/admin")
}
