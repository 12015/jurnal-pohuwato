import { useState } from 'react';
import {
  HelpCircle, ChevronDown, ChevronRight, LogIn, User, FileText,
  Eye, History, CheckSquare, Users, Download, Mail,
} from 'lucide-react';
import type { UserRole } from '../../types';

interface BantuanProps {
  role: UserRole;
}

interface Step {
  icon: any;
  title: string;
  content: string[];
}

export function Bantuan({ role }: BantuanProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const guruSteps: Step[] = [
    {
      icon: LogIn,
      title: '1. Login ke Aplikasi',
      content: [
        'Buka halaman aplikasi JURNAL.',
        'Klik tombol "Daftar sekarang" jika belum punya akun.',
        'Pilih role "GURU", isi email dan password (minimal 6 karakter).',
        'Setelah daftar, login dengan email dan password Anda.',
      ],
    },
    {
      icon: User,
      title: '2. Lengkapi Profil Guru',
      content: [
        'Buka menu "Profil Guru" di sidebar.',
        'Isi data wajib: Nama Lengkap, NIP, Jabatan, Mata Pelajaran, Unit Kerja, dan Kecamatan.',
        'Penting: Unit Kerja harus sama persis dengan Unit Kerja Binaan pengawas Anda.',
        'Upload foto profil, logo kabupaten, dan logo sekolah (opsional tapi disarankan).',
        'Isi data Kepala Satuan Pendidikan dan Pengawas Bina beserta NIP.',
        'Klik "SIMPAN PROFIL".',
      ],
    },
    {
      icon: FileText,
      title: '3. Input Jurnal Harian',
      content: [
        'Buka menu "Input Jurnal".',
        'Pilih tanggal di bagian atas form.',
        'Isi kegiatan: Jam, Jenis Kegiatan (KBM/Rapat/Piket/dll), Agenda/Mapel, Lokasi/Kelas, Kegiatan/Tujuan, dan Keterangan.',
        'Maksimal 9 kegiatan per hari. Klik "+ Tambah Kegiatan" untuk menambah baris.',
        'Klik "SIMPAN JURNAL" untuk menyimpan.',
        'Satu hari hanya bisa memiliki 1 entri jurnal. Untuk mengubah, gunakan tombol Edit di riwayat.',
      ],
    },
    {
      icon: History,
      title: '4. Lihat & Kelola Riwayat',
      content: [
        'Buka menu "Riwayat Jurnal" untuk melihat semua jurnal.',
        'Gunakan filter Bulan/Tahun untuk melihat periode tertentu.',
        'Klik kartu jurnal untuk expand detail kegiatan.',
        'Tombol "Export CSV" untuk mengunduh data dalam format Excel/Spreadsheet.',
        'Gunakan tombol Edit atau Hapus sesuai kebutuhan.',
      ],
    },
    {
      icon: Eye,
      title: '5. Cetak Dokumen (Preview & Cetak)',
      content: [
        'Buka menu "Preview & Cetak".',
        'Pilih jenis dokumen: JURNAL, REKOMENDASI, SPTJM, PERNYATAAN, atau PERJANJIAN.',
        'Pilih periode filter: Bulanan atau Triwulan.',
        'Klik "DOWNLOAD PDF" untuk mengunduh dokumen dalam format F4 (Folio).',
        'Hasil PDF sudah siap cetak, termasuk kop surat dan tanda tangan pejabat.',
      ],
    },
    {
      icon: CheckSquare,
      title: '6. Status Verifikasi Pengawas',
      content: [
        'Setiap bulan/triwulan, jurnal Anda akan diverifikasi oleh Pengawas Bina.',
        'Anda bisa melihat status verifikasi di menu "Preview & Cetak" → REKOMENDASI.',
        'Jika sudah disetujui, surat rekomendasi akan menampilkan status "BERHAK MENERIMA TPG/TPP".',
        'Jika belum, pengawas akan meminta Anda melengkapi jurnal.',
      ],
    },
  ];

  const pengawasSteps: Step[] = [
    {
      icon: LogIn,
      title: '1. Login sebagai Pengawas',
      content: [
        'Daftar dengan role "PENGAWAS".',
        'Wajib isi "Unit Kerja yang Dibina" — tulis persis sama dengan Unit Kerja guru binaan (contoh: "SMP Negeri 1 Randangan").',
        'Setelah daftar, login dengan email dan password Anda.',
      ],
    },
    {
      icon: Users,
      title: '2. Cek Daftar Guru Binaan',
      content: [
        'Buka menu "Daftar Guru Binaan".',
        'Guru otomatis muncul jika: (1) sudah mendaftar, (2) sudah isi Profil, (3) Unit Kerjanya sama dengan Unit Kerja Binaan Anda.',
        'Lihat kolom "Jurnal" untuk melihat progres pengisian setiap guru.',
        'Status berwarna: Hijau (Lengkap ≥80%), Kuning (Kurang 40-79%), Merah (Belum <40%).',
      ],
    },
    {
      icon: FileText,
      title: '3. Verifikasi Jurnal Guru',
      content: [
        'Buka menu "Verifikasi Jurnal".',
        'Pilih guru dari daftar kartu.',
        'Gunakan filter Bulan/Triwulan untuk melihat jurnal periode tertentu.',
        'Periksa statistik kelengkapan: minimal 80% dari total hari kerja.',
        'Klik "Setujui Bulan Ini" jika guru sudah memenuhi syarat.',
        'Jika guru mengedit jurnalnya setelah disetujui, status approval tetap berlaku kecuali Anda batalkan manual.',
      ],
    },
    {
      icon: CheckSquare,
      title: '4. Persetujuan Sekaligus',
      content: [
        'Buka menu "Persetujuan" untuk melihat semua guru dalam 1 tabel.',
        'Gunakan tombol "Setujui Semua" untuk menyetujui semua guru yang eligible (≥80%) sekaligus.',
        'Tombol "Batal" untuk membatalkan persetujuan bila ada temuan.',
      ],
    },
    {
      icon: Download,
      title: '5. Cetak Rekomendasi TPG',
      content: [
        'Setelah guru disetujui, buka "Preview & Cetak" (dari sisi guru akan muncul di akun masing-masing).',
        'Pilih jenis "REKOMENDASI", pilih bulan/triwulan.',
        'Download PDF untuk diserahkan ke dinas atau arsip.',
      ],
    },
    {
      icon: Mail,
      title: '6. Catatan Penting',
      content: [
        'Satu guru hanya terlihat oleh pengawas yang Unit Kerja Binaannya sama.',
        'Pastikan guru-guru telah mengisi Unit Kerja dengan benar di Profil masing-masing.',
        'Jika guru tidak muncul di daftar binaan, periksa: guru sudah isi profil? Unit Kerjanya sama persis?',
        'Unit Kerja bersifat case-insensitive (huruf besar/kecil tidak masalah), tapi tanda baca dan spasi harus sama.',
      ],
    },
  ];

  const steps = role === 'pengawas' ? pengawasSteps : guruSteps;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Bantuan & Panduan</h2>
            <p className="text-sm text-indigo-100 mt-0.5">
              Panduan penggunaan aplikasi untuk {role === 'pengawas' ? 'Pengawas' : 'Guru'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="flex-1 font-semibold text-slate-800 text-sm">{step.title}</p>
                <div className="shrink-0">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                  <ol className="space-y-2 text-sm text-slate-700">
                    {step.content.map((c, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="font-semibold text-amber-900 text-sm mb-1">Butuh bantuan lebih lanjut?</p>
        <p className="text-xs text-amber-800">
          Hubungi admin aplikasi atau pengawas bina Anda. Untuk masalah teknis, hubungi tim
          pengembang aplikasi.
        </p>
      </div>
    </div>
  );
}