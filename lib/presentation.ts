export const statusLabels: Record<string, string> = {
  baru: "Pengajuan baru",
  menunggu_hrga: "Pemeriksaan HRGA",
  menunggu_persetujuan: "Menunggu persetujuan",
  perlu_perbaikan: "Perlu perbaikan",
  ditolak: "Ditolak",
  disetujui: "Disetujui",
  pelaksanaan: "Dalam pelaksanaan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  dihapus: "Dihapus",
};

export function statusLabel(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
