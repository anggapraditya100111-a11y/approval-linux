"use client";

import { useEffect, useState } from "react";
import { formatDate, formatRupiah, statusLabel } from "@/lib/presentation";
import { useBranding } from "@/components/BrandingProvider";

type Submission = { id: string; number: string; title: string; requesterName: string; requesterUnit: string; formTypeName: string; amount: number; status: string; currentStep: number; createdAt: string };
type Data = { counts: Record<string, number>; totalAmount: number; latest: Submission[]; pendingMine: Submission[]; user: { name: string; role: string } };

export default function AdminDashboard({ view = "dashboard" }: { view?: string }) {
  const { branding } = useBranding();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/admin/summary?view=${view}`).then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); }).catch((e) => setError(e.message)); }, [view]);
  if (error) return <div className="admin-page"><div className="empty-state"><b>Data belum dapat dimuat</b><p>{error}</p></div></div>;
  if (!data) return <div className="admin-page"><div className="admin-loading"><span/><span/><span/></div></div>;
  const counts = data.counts;
  const titleMap: Record<string, string> = { dashboard: "Ringkasan hari ini", pengajuan: "Semua pengajuan", persetujuan: "Persetujuan saya", pelaksanaan: "Pelaksanaan pengajuan", arsip: "Arsip pengajuan" };
  const rows = view === "persetujuan" ? data.pendingMine : data.latest;
  return (
    <div className="admin-page">
      <div className="admin-topline"><div><span className="eyebrow">{branding.appName}</span><h1>{titleMap[view] || titleMap.dashboard}</h1><p>Selamat datang, {data.user.name}. Pantau proses pengajuan internal secara terpusat.</p></div><a href="/" target="_blank" className="button primary">Buka formulir publik <span>↗</span></a></div>
      {view === "dashboard" && <>
        <div className="stat-grid">
          <article><span className="stat-icon blue">＋</span><div><small>Pemeriksaan HRGA</small><b>{(counts.baru || 0)+(counts.menunggu_hrga||0)}</b><em>Perlu diperiksa & ditandatangani</em></div></article>
          <article><span className="stat-icon amber">…</span><div><small>Menunggu persetujuan</small><b>{counts.menunggu_persetujuan || 0}</b><em>Berjalan bertingkat</em></div></article>
          <article><span className="stat-icon green">✓</span><div><small>Disetujui</small><b>{(counts.disetujui || 0) + (counts.pelaksanaan || 0)}</b><em>Siap / sedang dilaksanakan</em></div></article>
          <article><span className="stat-icon navy">Rp</span><div><small>Total nilai aktif</small><b className="amount-stat">{formatRupiah(data.totalAmount)}</b><em>Di luar pengajuan selesai</em></div></article>
        </div>
        {data.pendingMine.length > 0 && <section className="attention-card"><div><span>!</span><div><b>Ada {data.pendingMine.length} pengajuan menunggu keputusan Anda</b><p>Selesaikan persetujuan agar proses dapat berlanjut ke tahap berikutnya.</p></div></div><a href="/admin/persetujuan">Lihat persetujuan →</a></section>}
      </>}
      <section className="admin-card table-card">
        <div className="card-heading"><div><b>{view === "persetujuan" ? "Menunggu keputusan Anda" : "Daftar pengajuan"}</b><small>Data terbaru yang masuk ke sistem</small></div><span>{rows.length} data</span></div>
        {rows.length ? <div className="submission-table"><div className="table-head"><span>Pengajuan</span><span>Pemohon</span><span>Nilai</span><span>Status</span><span /></div>{rows.map((row) => <a className="table-row" href={`/admin/pengajuan/${row.id}`} key={row.id}><div><b>{row.title}</b><small>{row.number} • {row.formTypeName}</small></div><div><b>{row.requesterName}</b><small>{row.requesterUnit} • {formatDate(row.createdAt, true)}</small></div><div><b>{row.amount ? formatRupiah(row.amount) : "—"}</b></div><div><span className={`status-pill status-${row.status}`}>{statusLabel(row.status)}</span></div><i>→</i></a>)}</div> : <div className="empty-state"><span>✓</span><b>Belum ada pengajuan pada bagian ini</b><p>Data akan tampil otomatis saat proses berjalan.</p></div>}
      </section>
    </div>
  );
}
