"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatDate } from "@/lib/presentation";

type TrackingItem = { id:string; number:string; requesterName:string; requesterUnit:string; status:string; createdAt:string; approvedAt:string|null };
type TrackingDetail = { submission: TrackingItem & { title:string; formTypeName:string }; approvals:Array<{stepNumber:number;approverTitle:string;status:string;actedAt:string|null}> };

const labels:Record<string,string> = { on_progress:"On progress", disetujui:"Disetujui", ditolak:"Ditolak", perlu_perbaikan:"Perlu perbaikan" };

export default function TrackingPanel(){
  const [items,setItems]=useState<TrackingItem[]>([]); const [selected,setSelected]=useState<TrackingItem|null>(null);
  const [detail,setDetail]=useState<TrackingDetail|null>(null); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  useEffect(()=>{fetch("/api/tracking").then(r=>r.json()).then(b=>setItems(b.submissions||[])).catch(()=>setError("Daftar pengajuan belum dapat dimuat."));},[]);
  async function open(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;const f=new FormData(e.currentTarget);setBusy(true);setError("");try{const r=await fetch("/api/tracking",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:selected.id,password:f.get("password")})});const b=await r.json();if(!r.ok)throw new Error(b.error);setDetail(b);}catch(err){setError(err instanceof Error?err.message:"Berkas belum dapat dibuka.");}finally{setBusy(false)}}
  return <section className="tracking-section">
    <div className="section-heading"><div><span className="eyebrow">Pantau pengajuan</span><h2>Periksa progres berkas Anda</h2></div><p>Nama pemohon disamarkan. Gunakan password yang dibuat saat pengajuan untuk membuka rincian berkas.</p></div>
    <div className="tracking-card">
      <div className="tracking-head"><span>Tanggal</span><span>Pemohon & divisi</span><span>Status</span><span/></div>
      {items.length?items.map(item=><button type="button" className="tracking-row" key={item.id} onClick={()=>{setSelected(item);setDetail(null);setError("")}}><span><b>{formatDate(item.createdAt)}</b><small>{item.number}</small></span><span><b>{item.requesterName}</b><small>{item.requesterUnit}</small></span><span><i className={`track-status ${item.status}`}>{labels[item.status]||item.status}</i>{item.approvedAt&&<small>{formatDate(item.approvedAt)}</small>}</span><b>→</b></button>):<div className="empty-state"><b>Belum ada pengajuan</b><p>Pengajuan yang masuk akan tampil di sini.</p></div>}
    </div>
    {selected&&<div className="tracking-modal" role="dialog" aria-modal="true"><button className="tracking-backdrop" aria-label="Tutup" onClick={()=>setSelected(null)}/><div className="tracking-dialog"><button className="modal-close" onClick={()=>setSelected(null)}>×</button>{!detail?<><span className="eyebrow">{selected.number}</span><h3>Buka rincian pengajuan</h3><p>Masukkan password berkas yang dibuat oleh pemohon.</p><form onSubmit={open}><label>Password berkas<input type="password" name="password" required autoFocus placeholder="Masukkan password"/></label>{error&&<p className="form-error">{error}</p>}<button disabled={busy} className="button primary">{busy?"Memeriksa...":"Buka berkas"}</button></form></>:<><span className="eyebrow">{detail.submission.number}</span><h3>{detail.submission.title}</h3><p>{detail.submission.formTypeName} • {detail.submission.requesterName}</p><div className="tracking-progress"><div><small>Status saat ini</small><b>{labels[detail.submission.status]||detail.submission.status}</b></div>{detail.approvals.map(a=><div key={a.stepNumber}><small>Tahap {a.stepNumber}</small><b>{a.approverTitle}</b><i>{a.status}{a.actedAt?` • ${formatDate(a.actedAt)}`:""}</i></div>)}</div></>}</div></div>}
  </section>
}
