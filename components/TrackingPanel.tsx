"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatDate, formatRupiah } from "@/lib/presentation";

type TrackingItem = {
  id: string; number: string; requesterName: string; requesterUnit: string;
  status: string; createdAt: string; approvedAt: string | null;
};

type TrackingSubmission = TrackingItem & {
  requesterPosition: string; requesterPhone: string; formTypeName: string;
  title: string; description: string; amount: number; neededDate: string | null;
  currentStep: number; updatedAt: string; completedAt: string | null;
};

type TrackingApproval = {
  stepNumber: number; approverName: string; approverTitle: string;
  status: string; note: string; actedAt: string | null;
};

type TrackingDocument = { id: string; fileName: string; mimeType: string; size: number; createdAt: string };
type TrackingDetail = { submission: TrackingSubmission; approvals: TrackingApproval[]; documents: TrackingDocument[] };

const labels: Record<string, string> = {
  on_progress: "Dalam proses",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  perlu_perbaikan: "Perlu perbaikan",
  menunggu: "Menunggu",
};

function approvalLabel(status: string) {
  return labels[status] || status.replaceAll("_", " ");
}

export default function TrackingPanel() {
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [selected, setSelected] = useState<TrackingItem | null>(null);
  const [detail, setDetail] = useState<TrackingDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filePassword, setFilePassword] = useState("");
  const [openingDocument, setOpeningDocument] = useState("");

  useEffect(() => {
    fetch("/api/tracking")
      .then((response) => response.json())
      .then((body) => setItems(body.submissions || []))
      .catch(() => setError("Daftar pengajuan belum dapat dimuat."));
  }, []);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, password: form.get("password") }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setDetail(body);
      setFilePassword(String(form.get("password") || ""));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Berkas belum dapat dibuka.");
    } finally { setBusy(false); }
  }

  async function openDocument(document: TrackingDocument) {
    if (!selected || !filePassword) return;
    setOpeningDocument(document.id); setError("");
    try {
      const response = await fetch("/api/tracking/file", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id:selected.id, password:filePassword, documentId:document.id }),
      });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error); }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = window.document.createElement("a");
      link.href = objectUrl; link.target = "_blank"; link.rel = "noopener"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lampiran belum dapat dibuka.");
    } finally { setOpeningDocument(""); }
  }

  function close() { setSelected(null); setDetail(null); setError(""); setFilePassword(""); }

  return <section className="tracking-section">
    <div className="section-heading">
      <div><span className="eyebrow">Pantau pengajuan</span><h2>Periksa progres berkas Anda</h2></div>
      <p>Nama pemohon disamarkan. Gunakan password yang dibuat saat pengajuan untuk membuka isi dan progres lengkap berkas.</p>
    </div>
    <div className="tracking-card">
      <div className="tracking-head"><span>Tanggal</span><span>Pemohon & divisi</span><span>Status</span><span /></div>
      {items.length ? items.map((item) => <button type="button" className="tracking-row" key={item.id} onClick={() => { setSelected(item); setDetail(null); setError(""); }}>
        <span><b>{formatDate(item.createdAt)}</b><small>{item.number}</small></span>
        <span><b>{item.requesterName}</b><small>{item.requesterUnit}</small></span>
        <span><i className={`track-status ${item.status}`}>{labels[item.status] || item.status}</i>{item.approvedAt && <small>{formatDate(item.approvedAt)}</small>}</span>
        <b>→</b>
      </button>) : <div className="empty-state"><b>Belum ada pengajuan</b><p>Pengajuan yang masuk akan tampil di sini.</p></div>}
    </div>

    {selected && <div className="tracking-modal" role="dialog" aria-modal="true">
      <button className="tracking-backdrop" aria-label="Tutup" onClick={close} />
      <div className={`tracking-dialog ${detail ? "tracking-dialog-detail" : ""}`}>
        <button className="modal-close" onClick={close} aria-label="Tutup">×</button>
        {!detail ? <>
          <span className="eyebrow">{selected.number}</span>
          <h3>Buka rincian pengajuan</h3>
          <p>Masukkan password berkas yang dibuat oleh pemohon.</p>
          <form onSubmit={open}>
            <label>Password berkas<input type="password" name="password" required autoFocus placeholder="Masukkan password" /></label>
            {error && <p className="form-error tracking-error">{error}</p>}
            <button disabled={busy} className="button primary">{busy ? "Memeriksa..." : "Buka berkas"}</button>
          </form>
        </> : <>
          <div className="tracking-detail-head">
            <div><span className="eyebrow">{detail.submission.number}</span><h3>{detail.submission.title}</h3><p>{detail.submission.formTypeName}</p></div>
            <i className={`track-status ${detail.submission.status}`}>{labels[detail.submission.status] || detail.submission.status}</i>
          </div>

          <div className="tracking-summary-grid">
            <div><small>Tanggal pengajuan</small><b>{formatDate(detail.submission.createdAt, true)}</b></div>
            <div><small>Tanggal dibutuhkan</small><b>{detail.submission.neededDate ? formatDate(detail.submission.neededDate) : "Tidak ditentukan"}</b></div>
            <div><small>Nominal pengajuan</small><b>{detail.submission.amount ? formatRupiah(detail.submission.amount) : "Tidak dicantumkan"}</b></div>
          </div>

          <section className="tracking-detail-card">
            <h4>Identitas pemohon</h4>
            <div className="tracking-info-grid">
              <div><small>Nama lengkap</small><b>{detail.submission.requesterName}</b></div>
              <div><small>Jabatan</small><b>{detail.submission.requesterPosition}</b></div>
              <div><small>Divisi / PoP</small><b>{detail.submission.requesterUnit}</b></div>
              <div><small>Nomor WhatsApp</small><b>{detail.submission.requesterPhone}</b></div>
            </div>
          </section>

          <section className="tracking-detail-card">
            <h4>Isi pengajuan</h4>
            <p className="tracking-description">{detail.submission.description}</p>
          </section>

          <section className="tracking-detail-card">
            <h4>Lampiran pengajuan <span>{detail.documents.length}</span></h4>
            {detail.documents.length ? <div className="tracking-documents">{detail.documents.map((document) => <button type="button" key={document.id} onClick={()=>openDocument(document)} disabled={openingDocument===document.id}>
              <span>{document.mimeType === "application/pdf" ? "PDF" : "IMG"}</span>
              <div><b>{document.fileName}</b><small>{Math.max(1, Math.ceil(document.size / 1024))} KB • {formatDate(document.createdAt)}</small></div>
              <i>{openingDocument===document.id?"Membuka...":"Buka ↗"}</i>
            </button>)}</div> : <p className="tracking-empty-note">Tidak ada lampiran tambahan.</p>}
            {error && <p className="form-error tracking-file-error">{error}</p>}
          </section>

          <section className="tracking-detail-card">
            <h4>Progres persetujuan</h4>
            <div className="tracking-progress">{detail.approvals.length ? detail.approvals.map((approval) => <div className={approval.status} key={approval.stepNumber}>
              <span>{approval.status === "disetujui" ? "✓" : approval.stepNumber}</span>
              <div><small>Tahap {approval.stepNumber}</small><b>{approval.approverTitle}</b><p>{approval.approverName}</p><i>{approvalLabel(approval.status)}{approval.actedAt ? ` • ${formatDate(approval.actedAt, true)}` : ""}</i>{approval.note && <em>Catatan: {approval.note}</em>}</div>
            </div>) : <p className="tracking-empty-note">Alur persetujuan belum ditetapkan.</p>}</div>
          </section>
        </>}
      </div>
    </div>}
  </section>;
}
