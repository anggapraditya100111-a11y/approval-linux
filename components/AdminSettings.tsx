"use client";

import { FormEvent, useEffect, useState } from "react";
import { useBranding } from "@/components/BrandingProvider";
import type { AppBranding } from "@/lib/branding-config";

type User = { id:string; email:string; username:string; name:string; role:string; jobTitle:string; department:string; active:number; hasPassword:number; hasSignature:number };
type FormType = { id:string; name:string; description:string; requiresAmount:number; active:number };
type Option = { id:string; kind:string; label:string; sortOrder:number; active:number };
type Data = { users:User[]; formTypes:FormType[]; options:Option[]; branding:AppBranding; currentUser:{role:string} };
type Tab = "form" | "master" | "users" | "identity" | "security";
type ThemeColors = Pick<AppBranding, "primaryColor" | "accentColor" | "headerColor" | "headerTextColor" | "titleColor">;

const themePalettes: Array<{ name:string; colors:ThemeColors }> = [
  { name:"AINET Biru", colors:{primaryColor:"#087fc1",accentColor:"#15b8dd",headerColor:"#071b33",headerTextColor:"#ffffff",titleColor:"#0b172a"} },
  { name:"Biru Cerah", colors:{primaryColor:"#2563eb",accentColor:"#38bdf8",headerColor:"#172554",headerTextColor:"#ffffff",titleColor:"#172554"} },
  { name:"Hijau Profesional", colors:{primaryColor:"#0f8a68",accentColor:"#34c99a",headerColor:"#123c34",headerTextColor:"#ffffff",titleColor:"#163d35"} },
  { name:"Ungu Modern", colors:{primaryColor:"#6d5bd0",accentColor:"#a78bfa",headerColor:"#2e2459",headerTextColor:"#ffffff",titleColor:"#312e55"} },
  { name:"Oranye Hangat", colors:{primaryColor:"#d66b16",accentColor:"#f0a33b",headerColor:"#442711",headerTextColor:"#ffffff",titleColor:"#3f2a1c"} },
];

function themeFromBranding(branding: AppBranding): ThemeColors {
  return {
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    headerColor: branding.headerColor,
    headerTextColor: branding.headerTextColor,
    titleColor: branding.titleColor,
  };
}

export default function AdminSettings() {
  const { setBranding } = useBranding();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("form");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);
  const [editingForm, setEditingForm] = useState<FormType | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [themeColors, setThemeColors] = useState<ThemeColors>(themePalettes[0].colors);

  function showMessage(text: string, type: "error" | "success" = "error") {
    setMessage(text); setMessageType(type);
  }

  async function load() {
    try {
      const response = await fetch("/api/admin/settings");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
      setBranding(body.branding);
      setThemeColors(themeFromBranding(body.branding));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Pengaturan belum dapat dimuat.");
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/settings")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body as Data;
      })
      .then((body) => { if (active) { setData(body); setBranding(body.branding); setThemeColors(themeFromBranding(body.branding)); } })
      .catch((error) => { if (active) showMessage(error instanceof Error ? error.message : "Pengaturan belum dapat dimuat."); });
    return () => { active = false; };
  }, [setBranding]);

  async function send(payload: Record<string, unknown>, successMessage = "Data berhasil disimpan.") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/settings", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.branding) setBranding(body.branding);
      await load();
      setEditingForm(null); setEditingUser(null);
      showMessage(successMessage, "success");
      return true;
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Data belum dapat disimpan.");
      return false;
    } finally { setBusy(false); }
  }

  async function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await send({ action:editingForm?"edit_form_type":"add_form_type", id:editingForm?.id, name:form.get("name"), description:form.get("description"), requiresAmount:form.get("requiresAmount")==="on" }, "Formulir berhasil disimpan.");
    if (ok && !editingForm) event.currentTarget.reset();
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await send({ action:"add_user", name:form.get("name"), username:form.get("username"), email:form.get("email"), role:form.get("role"), jobTitle:form.get("jobTitle"), department:form.get("department"), password:form.get("password") }, "Pengguna berhasil disimpan.");
    if (ok && !editingUser) event.currentTarget.reset();
  }

  async function saveOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await send({ action:"save_option", kind:form.get("kind"), label:form.get("label"), sortOrder:form.get("sortOrder") }, "Pilihan berhasil disimpan.");
    if (ok) event.currentTarget.reset();
  }

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await send({ action:"save_branding", appName:form.get("appName"), brandName:form.get("brandName"), appLabel:form.get("appLabel"), companyName:form.get("companyName"), appDescription:form.get("appDescription"), heroTitle:form.get("heroTitle"), heroHighlight:form.get("heroHighlight"), heroDescription:form.get("heroDescription"), footerText:form.get("footerText"), ...themeColors }, "Identitas dan warna aplikasi berhasil diperbarui.");
  }

  async function saveAccessPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/access-password", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ password:form.get("password"), confirmation:form.get("confirmation") }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      formElement.reset();
      showMessage(body.message, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Password belum dapat diganti.");
    } finally { setBusy(false); }
  }

  async function uploadLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/branding/logo", { method:"POST", body:form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setBranding(body.branding); await load(); formElement.reset();
      showMessage("Logo aplikasi berhasil diperbarui.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Logo belum dapat diunggah.");
    } finally { setBusy(false); }
  }

  async function removeLogo() {
    if (!window.confirm("Hapus logo aplikasi dan gunakan tanda huruf bawaan?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/branding/logo", { method:"DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setBranding(body.branding); await load(); showMessage("Logo aplikasi berhasil dihapus.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Logo belum dapat dihapus.");
    } finally { setBusy(false); }
  }

  const superAdmin = data?.currentUser.role === "super_admin";
  return <div className="admin-page settings-page">
    <div className="admin-topline"><div><span className="eyebrow">Administrasi</span><h1>Pengaturan aplikasi</h1><p>Kelola formulir, identitas aplikasi, keamanan, serta pengguna internal.</p></div></div>
    {message && <p className={`${messageType === "success" ? "field-message" : "form-error"} inline-error`}>{message}</p>}
    <div className="settings-tabs">
      <button className={tab === "form" ? "active" : ""} onClick={() => setTab("form")}>Jenis formulir</button>
      <button className={tab === "master" ? "active" : ""} onClick={() => setTab("master")}>Jabatan & divisi</button>
      <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Pengguna & akses</button>
      {superAdmin && <button className={tab === "identity" ? "active" : ""} onClick={() => setTab("identity")}>Identitas aplikasi</button>}
      {superAdmin && <button className={tab === "security" ? "active" : ""} onClick={() => setTab("security")}>Password masuk</button>}
    </div>

    {!data ? <div className="admin-loading"><span/><span/><span/></div>
      : tab === "form" ? <div className="settings-layout">
        <section className="admin-card settings-list"><div className="card-heading"><div><b>Formulir publik</b><small>Edit atau aktifkan formulir yang tersedia bagi pemohon</small></div></div>{data.formTypes.map((item) => <div className="setting-row" key={item.id}><span>FM</span><div><b>{item.name}</b><small>{item.description}</small></div><em className={item.active?"on":"off"}>{item.active?"Aktif":"Nonaktif"}</em><div className="setting-actions"><button onClick={() => setEditingForm(item)}>Edit</button><button disabled={busy} onClick={() => send({action:"toggle_form_type",id:item.id})}>{item.active?"Nonaktifkan":"Aktifkan"}</button></div></div>)}</section>
        <section className="admin-card settings-form"><div className="card-heading"><div><b>{editingForm?"Edit formulir":"Tambah formulir"}</b><small>{editingForm?"Perubahan berlaku pada pengajuan berikutnya":"Form baru langsung tersedia di halaman publik"}</small></div></div><form key={editingForm?.id||"new"} onSubmit={saveForm}><label>Nama formulir<input name="name" required defaultValue={editingForm?.name||""} placeholder="Contoh: Permohonan Cuti"/></label><label>Deskripsi<textarea name="description" rows={4} required defaultValue={editingForm?.description||""}/></label><label className="setting-check"><input type="checkbox" name="requiresAmount" defaultChecked={!!editingForm?.requiresAmount}/><span>Nominal wajib diisi</span></label><button disabled={busy} className="button primary">{editingForm?"Simpan perubahan":"Simpan formulir"}</button>{editingForm&&<button type="button" className="text-button" onClick={() => setEditingForm(null)}>Batal mengedit</button>}</form></section>
      </div>
      : tab === "master" ? <div className="settings-layout">
        <section className="admin-card settings-list"><div className="card-heading"><div><b>Pilihan jabatan & divisi</b><small>Pemohon tetap dapat memilih “Lainnya” dan mengisi manual</small></div></div>{data.options.map((item) => <div className="setting-row" key={item.id}><span>{item.kind==="job_title"?"JB":"DV"}</span><div><b>{item.label}</b><small>{item.kind==="job_title"?"Jabatan":"Divisi / PoP"}</small></div><em className={item.active?"on":"off"}>{item.active?"Aktif":"Nonaktif"}</em><button disabled={busy} onClick={() => send({action:"toggle_option",id:item.id})}>{item.active?"Nonaktifkan":"Aktifkan"}</button></div>)}</section>
        <section className="admin-card settings-form"><div className="card-heading"><div><b>Tambah pilihan</b><small>Atur daftar dropdown pada formulir publik</small></div></div><form onSubmit={saveOption}><label>Jenis<select name="kind"><option value="job_title">Jabatan</option><option value="division">Divisi / PoP</option></select></label><label>Nama pilihan<input name="label" required placeholder="Contoh: Manager Teknis"/></label><label>Urutan<input name="sortOrder" type="number" defaultValue="50"/></label><button disabled={busy} className="button primary">Simpan pilihan</button></form></section>
      </div>
      : tab === "users" ? <div className="settings-layout">
        <section className="admin-card settings-list"><div className="card-heading"><div><b>Pengguna internal</b><small>Password approval dibuat satu kali untuk setiap pejabat</small></div></div>{data.users.map((item) => <div className="setting-row user-row" key={item.id}><span>{item.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</span><div><b>{item.name}</b><small>{item.email} • {item.jobTitle||item.role} • {item.hasPassword?"password siap":"password belum dibuat"} • {item.hasSignature?"tanda tangan tersimpan":"belum ada tanda tangan"}</small></div><em className={item.active?"on":"off"}>{item.active?"Aktif":"Nonaktif"}</em>{superAdmin&&<div className="setting-actions"><button onClick={() => setEditingUser(item)}>Edit</button><button disabled={busy} onClick={() => send({action:"toggle_user",email:item.email})}>{item.active?"Nonaktifkan":"Aktifkan"}</button></div>}</div>)}</section>
        <section className="admin-card settings-form"><div className="card-heading"><div><b>{editingUser?"Edit pengguna":"Tambah pengguna"}</b><small>{superAdmin?"Password yang sama dipakai untuk login dan tautan approval":"Hanya Super Admin yang dapat mengubah pengguna"}</small></div></div>{superAdmin?<form key={editingUser?.id||"new-user"} onSubmit={saveUser}><label>Nama lengkap<input name="name" required defaultValue={editingUser?.name||""}/></label><div className="form-grid"><label>Username<input name="username" required defaultValue={editingUser?.username||""}/></label><label>Email akun<input name="email" type="email" required readOnly={!!editingUser} defaultValue={editingUser?.email||""}/></label></div><div className="form-grid"><label>Jabatan<input name="jobTitle" required defaultValue={editingUser?.jobTitle||""}/></label><label>Divisi<input name="department" defaultValue={editingUser?.department||""}/></label></div><label>Hak akses<select name="role" defaultValue={editingUser?.role||"approver"}><option value="approver">Approval</option><option value="admin">Admin / HRGA</option><option value="super_admin">Super Admin</option></select></label><label>Password akun / approval<input name="password" type="password" minLength={4} required={!editingUser?.hasPassword} placeholder={editingUser?.hasPassword?"Kosongkan jika tidak diubah":"Minimal 4 karakter"}/></label><button disabled={busy} className="button primary">Simpan pengguna</button>{editingUser&&<button type="button" className="text-button" onClick={() => setEditingUser(null)}>Batal mengedit</button>}</form>:<div className="mini-empty">Masuk sebagai Super Admin untuk mengelola pengguna.</div>}</section>
      </div>
      : tab === "identity" && superAdmin ? <div className="branding-settings-layout">
        <section className="admin-card branding-logo-card"><div className="card-heading"><div><b>Logo aplikasi</b><small>PNG, JPG, atau WebP • maksimal 2 MB</small></div></div><div className="branding-logo-preview">{data.branding.logoUrl?<img src={data.branding.logoUrl} alt={data.branding.appName}/>:<span>{data.branding.brandName.slice(0,1)}</span>}</div><form onSubmit={uploadLogo}><label>Pilih logo<input name="logo" type="file" required accept="image/png,image/jpeg,image/webp"/></label><button disabled={busy} className="button primary">Unggah logo</button>{data.branding.logoUrl&&<button type="button" disabled={busy} className="button secondary" onClick={removeLogo}>Hapus logo</button>}</form></section>
        <section className="admin-card settings-form branding-form">
          <div className="card-heading"><div><b>Nama, tulisan, dan warna aplikasi</b><small>Perubahan langsung diterapkan pada halaman publik, admin, login, dan link approval</small></div></div>
          <form key={`${data.branding.logoUpdatedAt}-${data.branding.appName}-${data.branding.primaryColor}`} onSubmit={saveIdentity}>
            <div className="form-grid"><label>Nama aplikasi<input name="appName" required maxLength={80} defaultValue={data.branding.appName}/></label><label>Nama brand<input name="brandName" required maxLength={30} defaultValue={data.branding.brandName}/></label></div>
            <div className="form-grid"><label>Label aplikasi<input name="appLabel" required maxLength={30} defaultValue={data.branding.appLabel}/></label><label>Nama perusahaan<input name="companyName" required maxLength={120} defaultValue={data.branding.companyName}/></label></div>
            <label>Deskripsi aplikasi<input name="appDescription" required maxLength={180} defaultValue={data.branding.appDescription}/></label>
            <div className="form-grid"><label>Judul halaman awal<input name="heroTitle" required maxLength={100} defaultValue={data.branding.heroTitle}/></label><label>Teks sorotan judul<input name="heroHighlight" required maxLength={100} defaultValue={data.branding.heroHighlight}/></label></div>
            <label>Deskripsi halaman awal<textarea name="heroDescription" required maxLength={320} rows={4} defaultValue={data.branding.heroDescription}/></label>
            <label>Teks bagian bawah<input name="footerText" required maxLength={120} defaultValue={data.branding.footerText}/></label>

            <div className="theme-form-heading"><b>Palet warna</b><small>Pilih palet siap pakai atau atur setiap warna secara manual.</small></div>
            <div className="theme-presets">{themePalettes.map((palette) => {
              const selected = JSON.stringify(themeColors) === JSON.stringify(palette.colors);
              return <button type="button" className={selected ? "active" : ""} key={palette.name} onClick={() => setThemeColors(palette.colors)}>
                <span><i style={{background:palette.colors.headerColor}}/><i style={{background:palette.colors.primaryColor}}/><i style={{background:palette.colors.accentColor}}/></span>
                <b>{palette.name}</b>{selected && <em>Dipilih</em>}
              </button>;
            })}</div>
            <div className="theme-color-grid">
              <label>Warna utama<div><input type="color" value={themeColors.primaryColor} onChange={(event)=>setThemeColors({...themeColors,primaryColor:event.target.value})}/><span>{themeColors.primaryColor}</span></div></label>
              <label>Warna aksen<div><input type="color" value={themeColors.accentColor} onChange={(event)=>setThemeColors({...themeColors,accentColor:event.target.value})}/><span>{themeColors.accentColor}</span></div></label>
              <label>Warna header/sidebar<div><input type="color" value={themeColors.headerColor} onChange={(event)=>setThemeColors({...themeColors,headerColor:event.target.value})}/><span>{themeColors.headerColor}</span></div></label>
              <label>Warna tulisan header<div><input type="color" value={themeColors.headerTextColor} onChange={(event)=>setThemeColors({...themeColors,headerTextColor:event.target.value})}/><span>{themeColors.headerTextColor}</span></div></label>
              <label>Warna judul<div><input type="color" value={themeColors.titleColor} onChange={(event)=>setThemeColors({...themeColors,titleColor:event.target.value})}/><span>{themeColors.titleColor}</span></div></label>
            </div>
            <button disabled={busy} className="button primary">Simpan identitas dan warna</button>
          </form>
        </section>
      </div>
      : tab === "security" && superAdmin ? <div className="security-settings-layout"><section className="admin-card settings-form security-card"><div className="card-heading"><div><b>Password masuk aplikasi</b><small>Password ini dibagikan kepada pengguna internal sebelum halaman aplikasi dapat dibuka</small></div></div><form onSubmit={saveAccessPassword}><label>Password baru<div className="password-input"><input name="password" type={showAccessPassword?"text":"password"} required minLength={8} maxLength={64} pattern="[A-Za-z0-9]+" autoComplete="new-password" placeholder="8–64 huruf dan angka"/><button type="button" onClick={() => setShowAccessPassword(!showAccessPassword)} aria-label={showAccessPassword?"Sembunyikan password":"Lihat password"} title={showAccessPassword?"Sembunyikan password":"Lihat password"}>👁</button></div></label><label>Ulangi password baru<div className="password-input"><input name="confirmation" type={showAccessPassword?"text":"password"} required minLength={8} maxLength={64} pattern="[A-Za-z0-9]+" autoComplete="new-password" placeholder="Ketik ulang password"/><button type="button" onClick={() => setShowAccessPassword(!showAccessPassword)} aria-label={showAccessPassword?"Sembunyikan password":"Lihat password"} title={showAccessPassword?"Sembunyikan password":"Lihat password"}>👁</button></div></label><p className="settings-hint">Gunakan kombinasi huruf dan angka tanpa spasi atau simbol. Setelah disimpan, perangkat lain akan diminta memasukkan password baru.</p><button disabled={busy} className="button primary">Ganti password masuk</button></form></section></div>
      : <div className="mini-empty">Menu ini hanya tersedia untuk Super Admin.</div>}
  </div>;
}
