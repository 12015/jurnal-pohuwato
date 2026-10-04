import { Info, BookOpen, Code, Mail, MapPin, Calendar, Sparkles, Shield } from 'lucide-react';

export function Tentang() {
  const version = '1.0.0';
  const currentYear = new Date().getFullYear();

  const features = [
    'Input jurnal kegiatan harian guru',
    'Cetak dokumen resmi (Jurnal, Rekomendasi, SPTJM, Pernyataan, Perjanjian)',
    'Verifikasi dan persetujuan oleh Pengawas Sekolah',
    'Format PDF ukuran F4 (Folio) siap cetak',
    'Sinkronisasi data lintas perangkat',
    'Multi-role: Guru dan Pengawas',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">JURNAL GURU</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Sistem Jurnal Kegiatan Harian Guru
            </p>
            <p className="text-indigo-100 text-xs mt-1">
              Kabupaten Pohuwato
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Versi {version}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white px-3 py-1 rounded-full text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            {currentYear}
          </span>
        </div>
      </div>

      {/* Deskripsi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-base">Tentang Aplikasi</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          <strong>JURNAL GURU</strong> adalah aplikasi berbasis web untuk mencatat, memverifikasi,
          dan mendokumentasikan kegiatan harian guru. Aplikasi ini dirancang untuk membantu guru
          dalam pelaporan kinerja dan membantu Pengawas Sekolah dalam proses verifikasi sebagai
          dasar penerbitan rekomendasi Tunjangan Profesi Guru (TPG) / Tambahan Penghasilan (TPP).
        </p>
      </div>

      {/* Fitur utama */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-base">Fitur Utama</h3>
        </div>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Info developer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-base">Pengembang</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Code className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">
                Dikembangkan oleh
              </p>
              <p className="text-sm font-semibold text-slate-800">
                Tim Pengembang Aplikasi JURNAL
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">
                Unit Kerja
              </p>
              <p className="text-sm font-semibold text-slate-800">
                SMP Negeri 1 Randangan, Kabupaten Pohuwato
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">
                Kontak
              </p>
              <p className="text-sm font-semibold text-slate-800">
                rois.rias@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lisensi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-base">Lisensi & Data</h3>
        </div>
        <div className="text-sm text-slate-600 space-y-2">
          <p>
            Aplikasi ini menggunakan infrastruktur:
          </p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Hosting frontend: <strong>Vercel</strong></li>
            <li>Database & autentikasi: <strong>Supabase (PostgreSQL)</strong></li>
            <li>Repositori kode: <strong>GitHub</strong></li>
          </ul>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 mt-3">
            Data guru dan jurnal hanya dapat diakses oleh pemiliknya masing-masing dan Pengawas
            Bina terkait, dilindungi oleh Row Level Security (RLS).
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4">
        <p>© {currentYear} Aplikasi JURNAL GURU Kabupaten Pohuwato</p>
        <p className="mt-1">Dibuat dengan ❤️ untuk guru-guru Indonesia</p>
      </div>
    </div>
  );
}