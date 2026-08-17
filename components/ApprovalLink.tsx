"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import BrandLockup from "@/components/BrandLockup";
import SignaturePad, { SignaturePadHandle } from "./SignaturePad";
import { formatDate } from "@/lib/presentation";

type Data = {
  approval: { approverName: string; approverTitle: string; stepNumber: number; hasStoredSignature: boolean };
  submission: { number: string; title: string; requesterName: string; requesterUnit: string; formTypeName: string; createdAt: string };
};

export default function ApprovalLink({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState("approve");
  const [stored, setStored] = useState(false);
  const signature = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    fetch(`/api/approval/${token}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
      setStored(!!body.approval.hasStoredSignature);
    }).catch((loadError) => setError(loadError.message));
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stored && signature.current?.isEmpty()) { setError("Bubuhkan tanda tangan keputusan."); return; }
    const form = new FormData(event.currentTarget);
    form.set("action", decision);
    form.set("useStored", String(stored));
    if (!stored) {
      const blob = await signature.current?.toBlob();
      if (blob) form.set("signature", blob, "tanda-tangan.png");
    }
    setBusy(true); setError("");
    const response = await fetch(`/api/approval/${token}`, { method: "POST", body: form });
    const body = await response.json();
    if (response.ok) setDone(true); else setError(body.error);
    setBusy(false);
  }

  return <main className="approval-link-page">
    <header><BrandLockup href="/"/><span>Tautan persetujuan aman</span></header>
    {error && !data
      ? <section className="approval-message"><b>Tautan tidak dapat dibuka</b><p>{error}</p></section>
      : done
        ? <section className="approval-message success"><span>✓</span><b>Keputusan berhasil direkam</b><p>Tautan ini otomatis dinonaktifkan. Tahap berikutnya dapat diproses oleh admin.</p></section>
        : data && <div className="approval-link-layout">
          <section className="approval-summary">
            <span className="eyebrow">Tahap {data.approval.stepNumber} • {data.submission.number}</span>
            <h1>{data.submission.title}</h1><p>{data.submission.formTypeName}</p>
            <div className="approval-facts">
              <div><small>Pemohon</small><b>{data.submission.requesterName}</b><span>{data.submission.requesterUnit}</span></div>
              <div><small>Tanggal pengajuan</small><b>{formatDate(data.submission.createdAt)}</b></div>
              <div><small>Pejabat approval</small><b>{data.approval.approverName}</b><span>{data.approval.approverTitle}</span></div>
            </div>
          </section>
          <section className="approval-decision">
            <h2>Berikan keputusan</h2><p>Masukkan password approval Anda, pilih keputusan, lalu tanda tangani.</p>
            <form onSubmit={submit}>
              <label>Password approval<input name="password" type="password" required autoComplete="current-password"/></label>
              <div className="decision-options">
                <label className={decision === "approve" ? "active approve" : ""}><input type="radio" checked={decision === "approve"} onChange={() => setDecision("approve")}/><b>Setujui</b><small>Lanjutkan proses</small></label>
                <label className={decision === "revision" ? "active revision" : ""}><input type="radio" checked={decision === "revision"} onChange={() => setDecision("revision")}/><b>Perbaikan</b><small>Kembalikan ke admin</small></label>
                <label className={decision === "reject" ? "active reject" : ""}><input type="radio" checked={decision === "reject"} onChange={() => setDecision("reject")}/><b>Tolak</b><small>Hentikan proses</small></label>
              </div>
              <label>Catatan{decision !== "approve" && <b>*</b>}<textarea name="note" rows={3} required={decision !== "approve"}/></label>
              {data.approval.hasStoredSignature && <label className="stored-choice"><input type="checkbox" checked={stored} onChange={(event) => setStored(event.target.checked)}/><span><b>Gunakan tanda tangan tersimpan</b><small>Matikan pilihan ini untuk membuat tanda tangan baru.</small></span></label>}
              {!stored && <SignaturePad ref={signature} label="Tanda tangan keputusan"/>}
              {error && <p className="form-error">{error}</p>}
              <button disabled={busy} className={`button ${decision === "reject" ? "danger" : "primary"}`}>{busy ? "Menyimpan..." : "Kirim keputusan"}</button>
            </form>
          </section>
        </div>}
  </main>;
}
