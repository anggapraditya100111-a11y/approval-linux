import AdminShell from "@/components/AdminShell";
import { requireAppUser } from "@/app/app-auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser("/admin");
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("ainet_sidebar")?.value === "collapsed";
  return <AdminShell user={user} initialCollapsed={initialCollapsed}>{children}</AdminShell>;
}
