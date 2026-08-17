import BrandLockup from "@/components/BrandLockup";

export default function DeniedPage() {
  return <main className="access-page"><BrandLockup/><section><span>403</span><h1>Akses belum diberikan</h1><p>Akun Anda belum terdaftar sebagai petugas atau pejabat persetujuan. Hubungi admin aplikasi untuk mendapatkan akses.</p><a className="button primary" href="/">Kembali ke formulir</a></section></main>;
}
