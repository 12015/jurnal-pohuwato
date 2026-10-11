import { useEffect, useMemo, useState } from 'react';
import {
  FileText, Activity, TrendingUp, CheckCircle2, AlertCircle,
  Plus, Eye, Award,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isWeekend, isSameDay, getMonth, getYear,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { TeacherData, JournalEntry, TabKey } from '../../types';
import { isHoliday } from '../../lib/holidays';
import { getVerificationStatus, submitJournalForVerification, type VerificationStatus } from '../../lib/db';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface DashboardGuruProps {
  teacher: TeacherData;
  journals: JournalEntry[];
  approvals: string[];
  onNavigate: (tab: TabKey) => void;
}

export function DashboardGuru({
  teacher,
  journals,
  approvals,
  onNavigate,
}: DashboardGuruProps) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const monthIdx = getMonth(today);
  const yearNow = getYear(today);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [loadingVerif, setLoadingVerif] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const periodKey = `m-${monthIdx}-${yearNow}`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const v = await getVerificationStatus(user.id, periodKey);
      if (mounted) {
        setVerification(v);
        setLoadingVerif(false);
      }
    })();
    return () => { mounted = false; };
  }, [periodKey]);

  // Hitung hari kerja bulan ini
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const workDaysThisMonth = useMemo(
    () =>
      eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
        (d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd'))
      ),
    [monthStart, monthEnd]
  );

  // Jurnal bulan ini
  const monthJournals = useMemo(
    () =>
      journals.filter((j) => {
        const d = parseISO(j.date);
        return getMonth(d) === monthIdx && getYear(d) === yearNow;
      }),
    [journals, monthIdx, yearNow]
  );

  const totalActivities = useMemo(
    () => monthJournals.reduce((sum, j) => sum + (j.activities?.length || 0), 0),
    [monthJournals]
  );

  const filledDays = monthJournals.length;
  const requiredDays = workDaysThisMonth.length;
  const percent = requiredDays > 0 ? Math.round((filledDays / requiredDays) * 100) : 0;

  const monthKey = `m-${monthIdx}-${yearNow}`;
  const triwulanKey = `q-${Math.floor(monthIdx / 3) + 1}-${yearNow}`;
  const isApproved = approvals.includes(monthKey) || approvals.includes(triwulanKey);
  const tpgEligible = percent >= 80;

  const hasFilledToday = journals.some((j) => isSameDay(parseISO(j.date), today));
  const isTodayWorkday =
    !isWeekend(today) && !isHoliday(todayStr);

  // Statistik
  const stats = [
    {
      label: 'Jurnal Bulan Ini',
      value: `${filledDays}/${requiredDays}`,
      sub: format(today, 'MMMM yyyy', { locale: localeId }),
      icon: <FileText className="w-4 h-4" />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Kegiatan',
      value: String(totalActivities),
      sub: 'Kegiatan tercatat',
      icon: <Activity className="w-4 h-4" />,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Kelengkapan',
      value: `${percent}%`,
      sub: percent >= 80 ? 'Baik' : 'Perlu dilengkapi',
      icon: <TrendingUp className="w-4 h-4" />,
      color: percent >= 80 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Status TPG',
      value: tpgEligible ? 'Memenuhi' : 'Belum',
      sub: isApproved ? 'Disetujui pengawas' : 'Menunggu pengawas',
      icon: isApproved ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />,
      color: tpgEligible ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Card Besar: Status Verifikasi + Statistik */}
      {!loadingVerif && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Baris 1: Status Verifikasi (4 kolom dengan divider) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 border-b border-slate-100">
            {/* Col 1: Diisi */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  filledDays > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {filledDays > 0 ? '✓' : '○'}
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">📋 Diisi</p>
              </div>
              <p className="text-base font-bold text-slate-800 leading-tight">
                {filledDays}<span className="text-xs text-slate-400">/{requiredDays}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">hari terisi</p>
            </div>

            {/* Col 2: Dikirim */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  verification?.guruSubmittedAt ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {verification?.guruSubmittedAt ? '✓' : '○'}
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">📤 Dikirim</p>
              </div>
              <p className="text-base font-bold text-slate-800 leading-tight">
                {verification?.guruSubmittedAt
                  ? format(parseISO(verification.guruSubmittedAt), 'd MMM', { locale: localeId })
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {verification?.guruSubmittedAt ? 'ke Kepala Sekolah' : 'belum dikirim'}
              </p>
            </div>

            {/* Col 3: Verifikasi Kepsek */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  verification?.kepsekStatus === 'approved' ? 'bg-emerald-500 text-white'
                    : verification?.kepsekStatus === 'rejected' ? 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {verification?.kepsekStatus === 'approved' ? '✓' : verification?.kepsekStatus === 'rejected' ? '✕' : '○'}
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">✅ Verifikasi</p>
              </div>
              <p className={`text-base font-bold leading-tight ${
                verification?.kepsekStatus === 'approved' ? 'text-emerald-600'
                  : verification?.kepsekStatus === 'rejected' ? 'text-rose-600'
                  : 'text-slate-800'
              }`}>
                {verification?.kepsekStatus === 'approved' ? 'Disetujui'
                  : verification?.kepsekStatus === 'rejected' ? 'Ditolak'
                  : 'Menunggu'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">oleh Kepala Sekolah</p>
            </div>

            {/* Col 4: Final Pengawas */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  verification?.pengawasStatus === 'approved' ? 'bg-emerald-500 text-white'
                    : verification?.pengawasStatus === 'rejected' ? 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {verification?.pengawasStatus === 'approved' ? '✓' : verification?.pengawasStatus === 'rejected' ? '✕' : '○'}
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">🎯 Final</p>
              </div>
              <p className={`text-base font-bold leading-tight ${
                verification?.pengawasStatus === 'approved' ? 'text-emerald-600'
                  : verification?.pengawasStatus === 'rejected' ? 'text-rose-600'
                  : 'text-slate-800'
              }`}>
                {verification?.pengawasStatus === 'approved' ? 'Disetujui'
                  : verification?.pengawasStatus === 'rejected' ? 'Ditolak'
                  : 'Menunggu'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">oleh Pengawas</p>
            </div>
          </div>

          {/* Baris 2: Statistik (4 kolom dengan divider) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
            {stats.map((s, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                    {s.label}
                  </p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tombol Kirim ke Kepala Sekolah (muncul kalau belum dikirim) */}
      {!loadingVerif && !verification?.guruSubmittedAt && filledDays > 0 && (
        <button
          onClick={async () => {
            setSubmitting(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('Tidak login');
              await submitJournalForVerification(user.id, periodKey);
              const v = await getVerificationStatus(user.id, periodKey);
              setVerification(v);
            } catch (e) {
              alert('Gagal kirim: ' + (e as Error).message);
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? 'Mengirim...' : '📤 Kirim Jurnal Bulan Ini ke Kepala Sekolah'}
        </button>
      )}

      {/* Warning terkunci */}
      {!loadingVerif && verification?.isLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          🔒 Jurnal bulan ini terkunci. Hubungi Kepala Sekolah untuk revisi.
        </div>
      )}

      {/* Pengingat: belum isi jurnal hari ini */}
      {isTodayWorkday && !hasFilledToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Anda belum mengisi jurnal hari ini
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Isi jurnal kegiatan Anda hari ini agar tidak menumpuk.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('journal')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Isi Sekarang
          </button>
        </div>
      )}

      {/* Progress kelengkapan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Kelengkapan Bulan Ini</p>
            <p className="text-xs text-slate-500">
              {filledDays} dari {requiredDays} hari kerja terisi
            </p>
          </div>
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-bold',
              percent >= 80
                ? 'bg-emerald-100 text-emerald-700'
                : percent >= 50
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700'
            )}
          >
            {percent}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500',
              percent >= 80
                ? 'bg-emerald-500'
                : percent >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Target minimal: <span className="font-semibold">80%</span> untuk kelayakan TPG
        </p>
      </div>

      {/* Aksi cepat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('journal')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-4 flex items-center gap-3 transition-colors text-left shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Input Jurnal Hari Ini</p>
            <p className="text-xs text-indigo-100 mt-0.5">Catat kegiatan mengajar Anda</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('preview')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-4 flex items-center gap-3 transition-colors text-left shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Lihat Preview & Cetak</p>
            <p className="text-xs text-slate-500 mt-0.5">Cetak PDF jurnal / rekomendasi</p>
          </div>
        </button>
      </div>

      {/* Reward card */}
      {percent >= 80 && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-sm">Kerja bagus!</p>
            <p className="text-xs text-emerald-50 mt-0.5">
              Anda telah memenuhi target kelengkapan jurnal bulan ini.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}