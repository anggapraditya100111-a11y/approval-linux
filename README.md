# AINET Approval

Aplikasi persetujuan internal full digital untuk menggantikan formulir kertas. Pemohon dapat mengajukan tanpa login, sedangkan pemeriksaan awal dilakukan HRGA dan approval berikutnya diproses bertingkat melalui tautan bertanda tangan digital.

## Fitur utama

- Pengajuan publik tanpa login, tanda tangan digital, dan lampiran foto/PDF.
- Gerbang password awal untuk membuka seluruh aplikasi pada perangkat internal.
- Password masuk dapat diganti oleh Super Admin dari aplikasi dengan validasi huruf dan angka.
- Nama aplikasi, brand, perusahaan, teks halaman awal, footer, dan logo dapat disesuaikan oleh Super Admin.
- Pengambilan lampiran langsung dari kamera perangkat.
- Dropdown jabatan dan divisi yang dapat dikelola admin, dengan isian manual.
- Password berbeda untuk setiap berkas agar pemohon dapat memantau progres.
- Daftar pantauan publik dengan nama pemohon disamarkan.
- Role Super Admin, Admin/HRGA, dan Approval.
- HRGA otomatis menjadi pemeriksa dan penandatangan tahap pertama.
- Approval bertingkat; tautan tahap berikutnya baru dapat dibuat setelah tahap sebelumnya menyetujui.
- Password satu kali per pejabat dan tanda tangan pejabat yang dapat digunakan kembali.
- Edit/hapus pengajuan hanya sebelum ada keputusan approval.
- Audit log, dokumen cetak/PDF, SQLite, upload lokal, backup sebelum update, dan health check.

## Instalasi CasaOS

Kebutuhan: Git, Docker, dan Docker Compose.

```bash
curl -fsSL https://raw.githubusercontent.com/anggapraditya100111-a11y/approval-linux/main/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

Lokasi default:

- Source: `/DATA/AppData/ainet-approval/app`
- Data: `/DATA/AppData/ainet-approval/app/data`
- Port: `8093`

Installer membuat password Super Admin acak dan menampilkannya setelah instalasi selesai.
Installer juga membuat password akses aplikasi acak yang dibagikan kepada pengguna internal.

## Instalasi Linux umum

```bash
git clone https://github.com/anggapraditya100111-a11y/approval-linux.git
cd approval-linux
chmod +x install-linux.sh update.sh backup.sh
sudo ./install-linux.sh
```

Data Linux umum disimpan di `/var/lib/ainet-approval`.

## Update

```bash
cd /DATA/AppData/ainet-approval/app
./update.sh
```

Sebelum mengambil pembaruan, aplikasi otomatis membuat backup database dan folder upload ke `data/backups/`.

## Perintah operasional

```bash
docker compose ps
docker compose logs -f --tail=100
./backup.sh
docker compose restart
```

Health check:

```bash
curl http://127.0.0.1:8093/health
```

## Konfigurasi

Salin `.env.example` menjadi `.env`. Variabel penting:

- `APP_PORT`: port host, default `8093`.
- `DATA_PATH`: lokasi permanen database dan upload.
- `ADMIN_USERNAME`: username Super Admin awal.
- `ADMIN_PASSWORD`: password Super Admin saat database pertama dibuat.
- `APP_ACCESS_PASSWORD`: password awal/fallback untuk membuka aplikasi sebelum diubah oleh Super Admin.
- `APP_BASE_URL`: alamat publik aplikasi untuk tautan approval dan tujuan setelah logout; default `https://approval.axindo.my.id`.

Password akses aplikasi disimpan sebagai cookie sesi HTTP-only selama 30 hari pada perangkat yang sudah lolos. Setelah diubah melalui menu Super Admin, hash password baru disimpan di volume data dan perangkat lain otomatis diminta memasukkan password baru. Endpoint `/health` tetap terbuka untuk pemeriksaan kesehatan container.

Password Super Admin awal hanya digunakan ketika database masih kosong. Perubahan `.env` tidak menimpa password akun yang sudah tersimpan. Password akses aplikasi selalu mengikuti nilai terbaru pada `.env`.

## Keamanan data

Database, upload, backup, serta `.env` tidak masuk Git. Password disimpan dalam bentuk hash bcrypt. Token tautan approval disimpan sebagai hash dan tidak memiliki masa kedaluwarsa, tetapi otomatis dinonaktifkan setelah keputusan diambil, berkas dibatalkan, atau dihapus.

## Lisensi

MIT License.
