"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import BrandLockup from "@/components/BrandLockup";
import { useBranding } from "@/components/BrandingProvider";

type User = { name: string; email: string; role: string; jobTitle: string };

const nav = [
  { href: "/admin", label: "Dashboard", icon: "DB" },
  { href: "/admin/pengajuan", label: "Semua Pengajuan", icon: "PG" },
  { href: "/admin/persetujuan", label: "Persetujuan Saya", icon: "OK" },
  { href: "/admin/pelaksanaan", label: "Pelaksanaan", icon: "PL" },
  { href: "/admin/arsip", label: "Arsip", icon: "AR" },
];

export default function AdminShell({ user, children, initialCollapsed = false }: { user: User; children: ReactNode; initialCollapsed?: boolean }) {
  const { branding } = useBranding();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      document.cookie = `ainet_sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }
  const initials = user.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const isAdmin = user.role === "admin" || user.role === "super_admin";
  return (
    <div className={`admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`admin-sidebar ${open ? "open" : ""}`}>
        <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label={collapsed ? "Perbesar menu" : "Perkecil menu"} aria-expanded={!collapsed}>{collapsed ? "›" : "‹"}</button>
        <BrandLockup href="/admin" className="brand admin-brand" />
        <nav>
          <span className="nav-caption">Utama</span>
          {nav.filter(item=>isAdmin||["/admin","/admin/persetujuan"].includes(item.href)).map((item) => <a key={item.href} href={item.href} title={collapsed?item.label:undefined} className={pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)) ? "active" : ""} onClick={() => setOpen(false)}><i>{item.icon}</i><span>{item.label}</span></a>)}
          <span className="nav-caption">Administrasi</span>
          {isAdmin&&<a href="/admin/pengaturan" title={collapsed?"Pengaturan":undefined} className={pathname.startsWith("/admin/pengaturan") ? "active" : ""} onClick={() => setOpen(false)}><i>AT</i><span>Pengaturan</span></a>}
          {isAdmin&&<a href="/admin/audit" title={collapsed?"Audit Log":undefined} className={pathname.startsWith("/admin/audit") ? "active" : ""} onClick={() => setOpen(false)}><i>LG</i><span>Audit Log</span></a>}
          <a href="/admin/profil" title={collapsed?"Tanda Tangan Saya":undefined} className={pathname.startsWith("/admin/profil") ? "active" : ""} onClick={() => setOpen(false)}><i>TT</i><span>Tanda Tangan Saya</span></a>
        </nav>
        <div className="sidebar-user"><span>{initials || "AU"}</span><div><b>{user.name}</b><small>{user.jobTitle || user.role}</small></div><a href="/logout" title="Keluar">↗</a></div>
      </aside>
      {open && <button className="sidebar-overlay" aria-label="Tutup menu" onClick={() => setOpen(false)} />}
      <section className="admin-main">
        <header className="mobile-admin-head"><button onClick={() => setOpen(true)} aria-label="Buka menu">☰</button><span>{branding.appName}</span><i>{initials || "AU"}</i></header>
        {children}
      </section>
    </div>
  );
}
