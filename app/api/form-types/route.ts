import { ensureSchema, getD1 } from "@/db/runtime";

export async function GET() {
  try {
    await ensureSchema();
    const rows = await getD1().prepare(`SELECT id, name, description, icon,
      requires_amount AS requiresAmount FROM form_types WHERE active = 1 ORDER BY rowid`).all();
    const options = await getD1().prepare(`SELECT id, kind, label FROM master_options
      WHERE active = 1 ORDER BY kind, sort_order, label`).all();
    return Response.json({ types: rows.results, options: options.results });
  } catch {
    return Response.json({ error: "Jenis formulir belum dapat dimuat." }, { status: 500 });
  }
}
