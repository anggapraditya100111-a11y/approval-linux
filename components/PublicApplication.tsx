"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import SignaturePad, { SignaturePadHandle } from "./SignaturePad";
import TrackingPanel from "./TrackingPanel";
import BrandLockup from "@/components/BrandLockup";
import { useBranding } from "@/components/BrandingProvider";

type FormType = {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiresAmount: number;
};

const fallbackTypes: FormType[] = [
  { id: "pengadaan", name: "Pengadaan Barang/Jasa", description: "Material, perangkat, atau jasa untuk kebutuhan perusahaan.", icon: "belanja", requiresAmount: 1 },
  { id: "operasional", name: "Pengeluaran Operasional", description: "Biaya kegiatan dan kebutuhan operasional perusahaan.", icon: "operasional", requiresAmount: 1 },
  { id: "pembayaran", name: "Permohonan Pembayaran", description: "Pembayaran tagihan vendor atau kewajiban perusahaan.", icon: "pembayaran", requiresAmount: 1 },
  { id: "aset", name: "Penggunaan / Pemindahan Aset", description: "Penggunaan, serah terima, atau pemindahan aset.", icon: "aset", requiresAmount: 0 },
  { id: "umum", name: "Pengajuan Umum", description: "Pengajuan internal lainnya di luar kategori yang tersedia.", icon: "dokumen", requiresAmount: 0 },
];

const iconText: Record<string, string> = {
  belanja: "PR", operasional: "OP", pembayaran: "Rp", aset: "AS", dokumen: "PG",
};

function currency(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
}

export default function PublicApplication() {
  const { branding } = useBranding();
  const [types, setTypes] = useState<FormType[]>(fallbackTypes);
  const [selected, setSelected] = useState<FormType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ number: string; title: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [options,setOptions]=useState<Array<{id:string;kind:string;label:string}>>([]);
  const [position,setPosition]=useState(""); const [unit,setUnit]=useState("");
  const [tab,setTab]=useState<"submit"|"track">("submit");
  const signatureRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    fetch("/api/form-types")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if(data.types?.length)setTypes(data.types); setOptions(data.options||[]); })
      .catch(() => undefined);
  }, []);

  function pick(type: FormType) {
    setSelected(type);
    setSuccess(null);
    setError("");
    window.setTimeout(() => document.getElementById("form-pengajuan")?.scrollIntoView({ behavior: "smooth" }), 40);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!selected) return;
    setError("");
    if (signatureRef.current?.isEmpty()) {
      setError("Tanda tangan pemohon wajib dibubuhkan sebelum pengajuan dikirim.");
      return;
    }
    const signature = await signatureRef.current?.toBlob();
    if (!signature) {
      setError("Tanda tangan belum dapat diproses. Silakan ulangi.");
      return;
    }
    const data = new FormData(form);
    data.set("formTypeId", selected.id);
    data.set("formTypeName", selected.name);
    data.set("amount", amount.replace(/\D/g, "") || "0");
    data.set("signature", signature, "tanda-tangan.png");
    files.forEach((file) => data.append("attachments", file));
    setSubmitting(true);
    try {
      const response = await fetch("/api/submissions", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pengajuan belum dapat dikirim.");
      setSuccess({ number: result.number, title: data.get("title") as string });
      setSelected(null);
      setAmount("");
      setFiles([]);
      setPosition(""); setUnit("");
      form.reset();
      signatureRef.current?.clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Pengajuan belum dapat dikirim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-shell">
      <header className="public-header">
        <BrandLockup href="/" />
        <div className="public-nav"><button className={tab==="submit"?"active":""} onClick={()=>setTab("submit")}>Buat pengajuan</button><button className={tab==="track"?"active":""} onClick={()=>setTab("track")}>Pantau pengajuan</button><a className="admin-link" href="/admin">Masuk petugas <span>→</span></a></div>
      </header>

      {tab==="submit"&&<><section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{branding.companyName}</span>
          <h1>{branding.heroTitle}<br/><em>{branding.heroHighlight}</em></h1>
          <p>{branding.heroDescription}</p>
          <div className="hero-meta">
            <span><i>01</i> Pilih formulir</span>
            <span><i>02</i> Lengkapi data</span>
            <span><i>03</i> Tanda tangan & kirim</span>
          </div>
        </div>
        <div className="hero-card" aria-hidden="true">
          <div className="doc-sheet">
            <div className="doc-top"><span>{branding.brandName}</span><b>{branding.appLabel.toUpperCase()}</b></div>
            <div className="doc-title-line" />
            <div className="doc-line wide" /><div className="doc-line" /><div className="doc-line medium" />
            <div className="doc-flow"><span>PEMOHON</span><i>→</i><span>MANAGER</span><i>→</i><span>GM</span></div>
            <div className="doc-stamp">TERCATAT<br/><small>DIGITAL</small></div>
          </div>
        </div>
      </section>

      {success && (
        <section className="success-banner" role="status">
          <span className="success-icon">✓</span>
          <div><strong>Pengajuan berhasil dikirim</strong><p>{success.title}</p></div>
          <div className="success-number"><small>Nomor pengajuan</small><b>{success.number}</b></div>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Tutup">×</button>
        </section>
      )}

      <section className="type-section" id="jenis-pengajuan">
        <div className="section-heading">
          <div><span className="eyebrow">Mulai pengajuan</span><h2>Pilih formulir yang dibutuhkan</h2></div>
          <p>Pilih kategori yang paling sesuai. Pengajuan umum dapat digunakan apabila kategorinya belum tersedia.</p>
        </div>
        <div className="type-grid">
          {types.map((type, index) => (
            <button className={`type-card ${selected?.id === type.id ? "selected" : ""}`} key={type.id} onClick={() => pick(type)}>
              <span className="type-index">0{index + 1}</span>
              <span className={`type-icon icon-${type.icon}`}>{iconText[type.icon] || "PG"}</span>
              <strong>{type.name}</strong>
              <small>{type.description}</small>
              <span className="type-action">Isi pengajuan <b>↗</b></span>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="form-section" id="form-pengajuan">
          <div className="form-side">
            <span className="eyebrow">Form digital</span>
            <h2>{selected.name}</h2>
            <p>Pastikan seluruh informasi yang disampaikan benar dan dapat dipertanggungjawabkan.</p>
            <div className="privacy-note"><b>Dokumen internal</b><span>Data hanya digunakan untuk proses administrasi dan persetujuan perusahaan.</span></div>
          </div>
          <form className="application-form" onSubmit={submit}>
            <div className="form-block">
              <div className="block-title"><span>01</span><div><b>Identitas pemohon</b><small>Data orang yang mengajukan</small></div></div>
              <div className="form-grid">
                <label>Nama lengkap<b>*</b><input name="requesterName" required placeholder="Nama pemohon" /></label>
                <label>Jabatan<b>*</b><select value={position} onChange={e=>setPosition(e.target.value)} required><option value="">Pilih jabatan</option>{options.filter(o=>o.kind==="job_title").map(o=><option key={o.id} value={o.label}>{o.label}</option>)}<option value="__other">Lainnya / isi manual</option></select>{position==="__other"?<input name="requesterPosition" required placeholder="Tulis jabatan pemohon"/>:<input type="hidden" name="requesterPosition" value={position}/>}</label>
                <label>Divisi / PoP<b>*</b><select value={unit} onChange={e=>setUnit(e.target.value)} required><option value="">Pilih divisi / PoP</option>{options.filter(o=>o.kind==="division").map(o=><option key={o.id} value={o.label}>{o.label}</option>)}<option value="__other">Lainnya / isi manual</option></select>{unit==="__other"?<input name="requesterUnit" required placeholder="Tulis divisi / PoP"/>:<input type="hidden" name="requesterUnit" value={unit}/>}</label>
                <label>Nomor WhatsApp<b>*</b><input name="requesterPhone" inputMode="numeric" required placeholder="08xxxxxxxxxx" /></label>
              </div>
            </div>
            <div className="form-block">
              <div className="block-title"><span>02</span><div><b>Detail pengajuan</b><small>Jelaskan kebutuhan secara lengkap</small></div></div>
              <div className="form-grid one">
                <label>Judul pengajuan<b>*</b><input name="title" required placeholder="Ringkasan singkat pengajuan" /></label>
                <label>Uraian dan alasan<b>*</b><textarea name="description" required rows={5} placeholder="Jelaskan keperluan, alasan, dan informasi pendukung lainnya..." /></label>
              </div>
              <div className="form-grid">
                <label>Nominal pengajuan{selected.requiresAmount ? <b>*</b> : <small> (opsional)</small>}<div className="currency-input"><span>Rp</span><input value={amount} onChange={(e) => setAmount(currency(e.target.value))} required={!!selected.requiresAmount} inputMode="numeric" placeholder="0" /></div></label>
                <label>Tanggal dibutuhkan<small> (opsional)</small><input name="neededDate" type="date" /></label>
              </div>
              <div className="upload-actions"><label className="upload-box"><input type="file" multiple accept="image/jpeg,image/png,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} /><span className="upload-icon">＋</span><b>Pilih dari perangkat</b><small>Foto atau PDF, maksimal 5 berkas</small></label><label className="upload-box camera"><input type="file" accept="image/*" capture="environment" onChange={(e)=>setFiles(current=>[...current,...Array.from(e.target.files||[])].slice(0,5))}/><span className="upload-icon">◎</span><b>Ambil foto</b><small>Buka kamera belakang perangkat</small></label></div>
              {files.length > 0 && <div className="file-list">{files.map((file) => <span key={file.name}>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></span>)}</div>}
            </div>
            <div className="form-block">
              <div className="block-title"><span>03</span><div><b>Pernyataan pemohon</b><small>Tanda tangan dan kirim pengajuan</small></div></div>
              <label className="statement"><input type="checkbox" required /><span>Saya menyatakan bahwa data dan dokumen yang disampaikan benar serta dapat dipertanggungjawabkan.</span></label>
              <SignaturePad ref={signatureRef} label="Tanda tangan pemohon" />
              <div className="form-grid one tracking-password"><label>Password pemantauan<b>*</b><input type="password" name="trackingPassword" minLength={4} required placeholder="Buat password khusus untuk berkas ini"/><small>Simpan password ini untuk membuka progres pengajuan.</small></label></div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions"><button type="button" className="button secondary" onClick={() => setSelected(null)}>Batal</button><button className="button primary" disabled={submitting}>{submitting ? "Mengirim..." : "Kirim pengajuan"}<span>→</span></button></div>
          </form>
        </section>
      )}</>}

      {tab==="track"&&<TrackingPanel/>}

      <footer><BrandLockup className="brand footer-brand"/><p>© {new Date().getFullYear()} {branding.companyName}</p><span>{branding.footerText}</span></footer>
    </main>
  );
}
