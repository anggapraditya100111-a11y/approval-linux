"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import SignaturePad, { SignaturePadHandle } from "./SignaturePad";
import { formatDate, formatRupiah, statusLabel } from "@/lib/presentation";

type Approval = { id: string; stepNumber: number; approverEmail: string; approverName: string; approverTitle: string; status: string; note: string; signatureKey: string | null; actedAt: string | null; linkEnabled:number };
type Submission = { id: string; number: string; formTypeName: string; requesterName: string; requesterPosition: string; requesterUnit: string; requesterPhone: string; title: string; description: string; amount: number; neededDate: string | null; status: string; currentStep: number; requesterSignatureKey: string; createdAt: string; completedAt: string | null };
type Detail = { submission: Submission; approvals: Approval[]; approvers:Array<{email:string;name:string;jobTitle:string;department:string;hasPassword:number}>; documents: Array<{ id: string; fileName: string; mimeType: string; size: number; objectKey: string }>; logs: Array<{ actorName: string; action: string; detail: string; createdAt: string }>; user: { email: string; name: string; role: string; hasSignature:boolean } };

const initialSteps = [
  { name: "", title: "Manager Teknis", email: "" },
  { name: "", title: "General Manager", email: "" },
];

function fileUrl(key: string) { return `/api/admin/files?key=${encodeURIComponent(key)}`; }
function approvalLabel(status: string) { return ({ menunggu: "Menunggu", disetujui: "Disetujui", ditolak: "Ditolak", perlu_perbaikan: "Perlu perbaikan" } as Record<string,string>)[status] || status; }

export default function SubmissionDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [steps, setSteps] = useState(initialSteps);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | "revision">("approve");
  const [useStored,setUseStored]=useState(false); const [linkUrl,setLinkUrl]=useState(""); const [editing,setEditing]=useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);

  function load() {
    fetch(`/api/admin/submissions/${id}`).then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); }).catch((e) => setMessage(e.message));
  }
  useEffect(load, [id]);

  async function routeApproval(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "route", steps }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error); load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Alur belum dapat disimpan."); } finally { setBusy(false); }
  }

  async function submitDecision(event: FormEvent) {
    event.preventDefault(); setMessage("");
    if (!useStored && signatureRef.current?.isEmpty()) { setMessage("Tanda tangan keputusan wajib dibubuhkan."); return; }
    const signature = useStored?null:await signatureRef.current?.toBlob(); if (!useStored&&!signature) return;
    const form = new FormData(); form.set("action", decision); form.set("note", note);form.set("useStored",String(useStored)); if(signature)form.set("signature", signature, "tanda-tangan.png");
    setBusy(true);
    try { const response = await fetch(`/api/admin/submissions/${id}`, { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setNote(""); signatureRef.current?.clear(); load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Keputusan belum dapat disimpan."); } finally { setBusy(false); }
  }

  async function changeStatus(action: string) {
    setBusy(true); setMessage("");
    try { const response = await fetch(`/api/admin/submissions/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Status belum dapat diubah."); } finally { setBusy(false); }
  }

  async function generateLink(){setBusy(true);setMessage("");try{const r=await fetch(`/api/admin/submissions/${id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"generate_link"})});const b=await r.json();if(!r.ok)throw new Error(b.error);setLinkUrl(b.url);await navigator.clipboard?.writeText(b.url);load()}catch(e){setMessage(e instanceof Error?e.message:"Tautan belum dapat dibuat.")}finally{setBusy(false)}}
  async function deleteSubmission(){if(!window.confirm("Hapus pengajuan ini? Tindakan hanya diizinkan sebelum ada persetujuan."))return;setBusy(true);const r=await fetch(`/api/admin/submissions/${id}`,{method:"DELETE"});const b=await r.json();if(r.ok)window.location.href="/admin/pengajuan";else{setMessage(b.error);setBusy(false)}}
  async function editSubmission(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const r=await fetch(`/api/admin/submissions/${id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"edit_submission",title:f.get("title"),description:f.get("description"),requesterPosition:f.get("requesterPosition"),requesterUnit:f.get("requesterUnit"),amount:String(f.get("amount")||"").replace(/\D/g,""),neededDate:f.get("neededDate")})});const b=await r.json();if(r.ok){setEditing(false);load()}else setMessage(b.error);setBusy(false)}

  if (!data) return <div className="admin-page"><div className="admin-loading"><span/><span/><span/></div>{message && <div className="form-error">{message}</div>}</div>;
  const s = data.submission;
  const isAdmin = ["admin", "super_admin"].includes(data.user.role);
  const hasActed=data.approvals.some(item=>!!item.actedAt);
  const activeApproval = data.approvals.find((item) => item.stepNumber === s.currentStep && item.status === "menunggu");
  const isMyTurn = ["menunggu_persetujuan","menunggu_hrga"].includes(s.status) && activeApproval?.approverEmail.toLowerCase() === data.user.email.toLowerCase();
  return (
    <div className="admin-page detail-page">
      <div className="detail-top"><div><a href="/admin/pengajuan">← Semua pengajuan</a><span className="eyebrow">{s.number}</span><h1>{s.title}</h1><div className="detail-meta"><span className={`status-pill status-${s.status}`}>{statusLabel(s.status)}</span><span>Dibuat {formatDate(s.createdAt, true)}</span></div></div><div className="detail-actions"><a className="button secondary bordered" href={`/admin/pengajuan/${id}/cetak`} target="_blank">Cetak dokumen</a>{isAdmin&&!hasActed&&<button className="button secondary bordered" onClick={()=>setEditing(!editing)}>Edit formulir</button>}{isAdmin&&!hasActed&&<button className="button danger" disabled={busy} onClick={deleteSubmission}>Hapus</button>}{isAdmin && s.status === "disetujui" && <button disabled={busy} className="button primary" onClick={() => changeStatus("start_execution")}>Mulai pelaksanaan</button>}{isAdmin && ["disetujui","pelaksanaan"].includes(s.status) && <button disabled={busy} className="button success" onClick={() => changeStatus("complete")}>Tandai selesai</button>}</div></div>
      {message && <p className="form-error inline-error">{message}</p>}
      <div className="detail-layout">
        <div className="detail-content">
          {editing&&<section className="admin-card detail-card edit-submission"><div className="card-heading"><div><b>Edit formulir pengajuan</b><small>Hanya dapat disimpan sebelum ada keputusan approval</small></div></div><form onSubmit={editSubmission}><div className="form-grid"><label>Jabatan<input name="requesterPosition" defaultValue={s.requesterPosition} required/></label><label>Divisi / PoP<input name="requesterUnit" defaultValue={s.requesterUnit} required/></label></div><label>Judul<input name="title" defaultValue={s.title} required/></label><label>Uraian<textarea name="description" defaultValue={s.description} rows={5} required/></label><div className="form-grid"><label>Nominal<input name="amount" type="number" defaultValue={s.amount}/></label><label>Tanggal dibutuhkan<input name="neededDate" type="date" defaultValue={s.neededDate||""}/></label></div><div className="form-actions"><button type="button" className="button secondary" onClick={()=>setEditing(false)}>Batal</button><button className="button primary" disabled={busy}>Simpan perubahan</button></div></form></section>}
          <section className="admin-card detail-card"><div className="card-heading"><div><b>Informasi pemohon</b><small>Identitas pembuat pengajuan</small></div></div><div className="info-grid"><div><small>Nama lengkap</small><b>{s.requesterName}</b></div><div><small>Jabatan</small><b>{s.requesterPosition}</b></div><div><small>Divisi / PoP</small><b>{s.requesterUnit}</b></div><div><small>WhatsApp</small><b>{s.requesterPhone}</b></div></div></section>
          <section className="admin-card detail-card"><div className="card-heading"><div><b>Rincian pengajuan</b><small>{s.formTypeName}</small></div></div><div className="description-box">{s.description}</div><div className="amount-box"><div><small>Nominal pengajuan</small><b>{s.amount ? formatRupiah(s.amount) : "Tidak dicantumkan"}</b></div><div><small>Tanggal dibutuhkan</small><b>{s.neededDate ? formatDate(s.neededDate) : "—"}</b></div></div></section>
          <section className="admin-card detail-card"><div className="card-heading"><div><b>Dokumen dan tanda tangan</b><small>Lampiran pendukung pengajuan</small></div></div><div className="signature-preview"><div><small>Tanda tangan pemohon</small><img src={fileUrl(s.requesterSignatureKey)} alt={`Tanda tangan ${s.requesterName}`} /><b>{s.requesterName}</b></div></div>{data.documents.length ? <div className="document-list">{data.documents.map((doc) => <a href={fileUrl(doc.objectKey)} target="_blank" key={doc.id}><span>{doc.mimeType === "application/pdf" ? "PDF" : "IMG"}</span><div><b>{doc.fileName}</b><small>{Math.ceil(doc.size / 1024)} KB</small></div><i>↗</i></a>)}</div> : <p className="no-docs">Tidak ada lampiran tambahan.</p>}</section>

          {isAdmin && ["baru","menunggu_hrga", "perlu_perbaikan"].includes(s.status) && <section className="admin-card detail-card route-card"><div className="card-heading"><div><b>Tetapkan alur setelah HRGA</b><small>HRGA menjadi tahap 1. Tautan tahap berikutnya baru aktif setelah tahap sebelumnya menyetujui.</small></div></div><form onSubmit={routeApproval}><div className="route-steps">{steps.map((step, index) => <div className="route-step" key={index}><span>{index + 2}</span><label>Pejabat approval<select required value={step.email} onChange={(e)=>{const picked=data.approvers.find(a=>a.email===e.target.value);setSteps(steps.map((item,i)=>i===index?{email:picked?.email||"",name:picked?.name||"",title:picked?.jobTitle||""}:item))}}><option value="">Pilih pejabat</option>{data.approvers.map(a=><option key={a.email} value={a.email}>{a.name} • {a.jobTitle}</option>)}</select></label><label>Nama<input readOnly value={step.name}/></label><label>Jabatan<input readOnly value={step.title}/></label>{steps.length > 1 && <button type="button" onClick={() => setSteps(steps.filter((_,i)=>i!==index))}>×</button>}</div>)}</div><div className="route-footer"><button type="button" className="text-button" onClick={() => setSteps([...steps,{name:"",title:"",email:""}])}>＋ Tambah tahap</button><button disabled={busy} className="button primary">{busy ? "Menyimpan..." : "Simpan alur approval"}</button></div></form></section>}

          {isMyTurn && <section className="admin-card detail-card decision-card"><div className="card-heading"><div><b>{s.currentStep===1?"Pemeriksaan dan tanda tangan HRGA":"Keputusan Anda"}</b><small>Tahap {s.currentStep} • {activeApproval?.approverTitle}</small></div></div><form onSubmit={submitDecision}><div className="decision-options"><label className={decision === "approve" ? "active approve" : ""}><input type="radio" name="decision" checked={decision === "approve"} onChange={() => setDecision("approve")}/><b>Setujui</b><small>Lanjutkan ke tahap berikutnya</small></label><label className={decision === "revision" ? "active revision" : ""}><input type="radio" name="decision" checked={decision === "revision"} onChange={() => setDecision("revision")}/><b>Minta perbaikan</b><small>Kembalikan kepada admin</small></label><label className={decision === "reject" ? "active reject" : ""}><input type="radio" name="decision" checked={decision === "reject"} onChange={() => setDecision("reject")}/><b>Tolak</b><small>Hentikan pengajuan</small></label></div><label className="decision-note">Catatan {decision !== "approve" && <b>*</b>}<textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} required={decision!=="approve"} placeholder="Tuliskan pertimbangan atau catatan keputusan..."/></label>{data.user.hasSignature&&<label className="stored-choice"><input type="checkbox" checked={useStored} onChange={e=>setUseStored(e.target.checked)}/><span><b>Gunakan tanda tangan tersimpan</b><small>Anda dapat membuat ulang tanda tangan dengan mematikan pilihan ini.</small></span></label>}{!useStored&&<SignaturePad ref={signatureRef} label="Tanda tangan keputusan"/>}<div className="route-footer"><span>Keputusan akan tercatat permanen di audit log.</span><button disabled={busy} className={`button ${decision === "reject" ? "danger" : "primary"}`}>{busy ? "Menyimpan..." : decision === "approve" ? "Setujui pengajuan" : decision === "revision" ? "Kirim untuk perbaikan" : "Tolak pengajuan"}</button></div></form></section>}
        </div>
        <aside className="detail-side">
          <section className="admin-card timeline-card"><div className="card-heading"><div><b>Alur persetujuan</b><small>{data.approvals.length ? `${data.approvals.length} tahap` : "Belum ditentukan"}</small></div></div>{data.approvals.length ? <div className="approval-timeline">{data.approvals.map((approval) => <div className={`${approval.status} ${approval.stepNumber === s.currentStep ? "current" : ""}`} key={approval.id}><span>{approval.status === "disetujui" ? "✓" : approval.status === "ditolak" ? "×" : approval.stepNumber}</span><div><b>{approval.approverTitle}</b><small>{approval.approverName}</small><em>{approvalLabel(approval.status)}{approval.actedAt ? ` • ${formatDate(approval.actedAt,true)}` : ""}</em>{approval.note && <p>{approval.note}</p>}{isAdmin&&approval.stepNumber===s.currentStep&&approval.status==="menunggu"&&approval.stepNumber>1&&<button className="send-link-button" disabled={busy} onClick={generateLink}>{approval.linkEnabled?"Buat ulang & salin tautan":"Kirim / salin tautan"}</button>}</div></div>)}</div> : <div className="mini-empty">Admin belum menetapkan approver.</div>}{linkUrl&&<div className="link-result"><small>Tautan sudah disalin</small><input readOnly value={linkUrl}/><button onClick={()=>navigator.clipboard?.writeText(linkUrl)}>Salin</button></div>}</section>
          <section className="admin-card log-card"><div className="card-heading"><div><b>Riwayat aktivitas</b><small>Audit proses pengajuan</small></div></div><div className="log-list">{data.logs.map((log,index)=><div key={index}><span/><div><b>{log.action.replaceAll("_"," ")}</b><small>{log.actorName} • {formatDate(log.createdAt,true)}</small>{log.detail && <p>{log.detail}</p>}</div></div>)}</div></section>
        </aside>
      </div>
    </div>
  );
}
