"use client";

import { useEffect, useState } from "react";
import { useBranding } from "@/components/BrandingProvider";
import { formatDate, formatRupiah, statusLabel } from "@/lib/presentation";

type Detail = { submission: any; approvals:any[]; documents:any[] };
const fileUrl = (key:string) => `/api/admin/files?key=${encodeURIComponent(key)}`;

export default function PrintableSubmission({ id }: { id:string }) {
  const { branding } = useBranding();
  const [data, setData] = useState<Detail | null>(null);
  useEffect(() => { fetch(`/api/admin/submissions/${id}`).then((response) => response.json()).then(setData); }, [id]);
  if (!data) return <div className="print-loading">Menyiapkan dokumen...</div>;
  const submission = data.submission;
  return <main className="print-page">
    <div className="print-tools"><button onClick={() => window.print()}>Cetak / Simpan PDF</button><button onClick={() => window.close()}>Tutup</button></div>
    <article className="approval-document">
      <header>
        <div className="print-brand">
          <span className={branding.logoUrl ? "has-logo" : ""}>{branding.logoUrl ? <img src={branding.logoUrl} alt={branding.appName}/> : branding.brandName.slice(0,1)}</span>
          <div><b>{branding.brandName}</b><small>{branding.companyName.toUpperCase()}</small></div>
        </div>
        <div><b>FORMULIR PERSETUJUAN INTERNAL</b><small>{submission.number}</small></div>
      </header>
      <section className="print-title"><span>{submission.formTypeName}</span><h1>{submission.title}</h1><div><b>{statusLabel(submission.status)}</b><small>Diajukan {formatDate(submission.createdAt,true)}</small></div></section>
      <section><h2>A. IDENTITAS PEMOHON</h2><div className="print-grid"><label>Nama lengkap<b>{submission.requesterName}</b></label><label>Jabatan<b>{submission.requesterPosition}</b></label><label>Divisi / PoP<b>{submission.requesterUnit}</b></label><label>Nomor WhatsApp<b>{submission.requesterPhone}</b></label></div></section>
      <section><h2>B. RINCIAN PENGAJUAN</h2><p className="print-description">{submission.description}</p><div className="print-grid two"><label>Nominal pengajuan<b>{submission.amount ? formatRupiah(submission.amount) : "Tidak dicantumkan"}</b></label><label>Tanggal dibutuhkan<b>{submission.neededDate ? formatDate(submission.neededDate) : "—"}</b></label></div></section>
      <section><h2>C. PERNYATAAN DAN TANDA TANGAN PEMOHON</h2><p className="print-statement">Saya menyatakan bahwa data dan dokumen yang disampaikan benar serta dapat dipertanggungjawabkan.</p><div className="print-signatures requester"><div><small>Pemohon</small><img src={fileUrl(submission.requesterSignatureKey)} alt="Tanda tangan pemohon"/><b>{submission.requesterName}</b><em>{submission.requesterPosition}</em></div></div></section>
      <section><h2>D. PERSETUJUAN</h2>{data.approvals.length ? <div className="print-signatures approvals">{data.approvals.map((approval) => <div key={approval.id}><small>Tahap {approval.stepNumber} • {approval.status}</small>{approval.signatureKey ? <img src={fileUrl(approval.signatureKey)} alt={`Tanda tangan ${approval.approverName}`}/> : <span className="signature-space"/>}<b>{approval.approverName}</b><em>{approval.approverTitle}</em>{approval.actedAt && <time>{formatDate(approval.actedAt,true)}</time>}{approval.note && <p>{approval.note}</p>}</div>)}</div> : <p className="print-empty">Alur persetujuan belum ditetapkan.</p>}</section>
      <footer><span>Dokumen ini dibuat secara elektronik melalui {branding.appName}.</span><b>{submission.number}</b></footer>
    </article>
  </main>;
}
