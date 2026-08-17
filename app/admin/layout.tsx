import AdminShell from "@/components/AdminShell";
import { requireAppUser } from "@/app/app-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser("/admin");
  return <AdminShell user={user}>{children}</AdminShell>;
}
