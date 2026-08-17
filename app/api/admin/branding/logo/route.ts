import { requireApiUser } from "@/app/app-auth";
import { getBucket, writeAudit } from "@/db/runtime";
import { setBrandingLogo } from "@/lib/branding";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user || user.role !== "super_admin") return Response.json({ error: "Hanya Super Admin yang dapat mengganti logo." }, { status: 403 });
  const form = await request.formData();
  const logo = form.get("logo");
  if (!(logo instanceof File) || !allowedTypes.has(logo.type) || logo.size > 2 * 1024 * 1024) {
    return Response.json({ error: "Logo harus PNG, JPG, atau WebP dengan ukuran maksimal 2 MB." }, { status: 400 });
  }
  await getBucket().put("branding/logo", await logo.arrayBuffer(), { httpMetadata: { contentType: logo.type } });
  const branding = await setBrandingLogo(true);
  await writeAudit({ actorEmail: user.email, actorName: user.name, action: "logo_aplikasi_diubah", detail: `${logo.name} • ${logo.size} byte` });
  return Response.json({ ok: true, branding });
}

export async function DELETE() {
  const user = await requireApiUser();
  if (!user || user.role !== "super_admin") return Response.json({ error: "Hanya Super Admin yang dapat menghapus logo." }, { status: 403 });
  await getBucket().delete("branding/logo");
  const branding = await setBrandingLogo(false);
  await writeAudit({ actorEmail: user.email, actorName: user.name, action: "logo_aplikasi_dihapus" });
  return Response.json({ ok: true, branding });
}
