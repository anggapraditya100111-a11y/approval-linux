import { getBucket } from "@/db/runtime";
import { getBranding } from "@/lib/branding";

export async function GET() {
  const branding = await getBranding();
  if (!branding.logoKey) return new Response("Not found", { status: 404 });
  const object = await getBucket().get(branding.logoKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=300");
  return new Response(object.body, { headers });
}
