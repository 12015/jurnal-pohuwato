import { useEffect, useMemo, useState } from 'react';
import { FileText, Activity, TrendingUp, CheckCircle2, AlertCircle, Plus, Eye, Calendar, Award, Clock, } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, subDays, getMonth, getYear, } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { TeacherData, JournalEntry, TabKey } from '../../types';
import { HOLIDAYS_2026 } from '../../types';
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
        (d) => !isWeekend(d) && !HOLIDAYS_2026.includes(format(d, 'yyyy-MM-dd'))
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

  // Status TPG: minimal 80% + approved
  const monthKey = `m-${monthIdx}-${yearNow}`;
  const triwulanKey = `q-${Math.floor(monthIdx / 3) + 1}-${yearNow}`;
  const isApproved = approvals.includes(monthKey) || approvals.includes(triwulanKey);
  const tpgEligible = percent >= 80;

  // Sudah isi hari ini?
  const hasFilledToday = journals.some((j) => isSameDay(parseISO(j.date), today));
  const isTodayWorkday =
    !isWeekend(today) && !HOLIDAYS_2026.includes(todayStr);

  // Grafik 7 hari terakhir
  const last7Days = useMemo(() => {
    const days: { date: Date; count: number; label: string; filled: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dStr = format(d, 'yyyy-MM-dd');
      const dayJournals = journals.filter((j) => isSameDay(parseISO(j.date), d));
      const count = dayJournals.reduce((s, j) => s + (j.activities?.length || 0), 0);
      days.push({
        date: d,
        count,
        label: format(d, 'EEE', { locale: localeId }),
        filled: dayJournals.length > 0,
      });
    }
    return days;
  }, [journals, today]);

  const maxCount = Math.max(...last7Days.map((d) => d.count), 1);

  // Kartu statistik
  const stats = [
    {
      label: 'Jurnal Bulan Ini',
      value: `${filledDays}/${requiredDays}`,
      sub: format(today, 'MMMM yyyy', { locale: localeId }),
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Kegiatan',
      value: String(totalActivities),
      sub: 'Kegiatan tercatat',
      icon: <Activity className="w-5 h-5" />,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Kelengkapan',
      value: `${percent}%`,
      sub: percent >= 80 ? 'Baik' : 'Perlu dilengkapi',
      icon: <TrendingUp className="w-5 h-5" />,
      color: percent >= 80 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Status TPG',
      value: tpgEligible ? 'Memenuhi' : 'Belum',
      sub: isApproved ? 'Disetujui pengawas' : 'Menunggu pengawas',
      icon: isApproved ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />,
      color: tpgEligible
        ? 'text-emerald-600 bg-emerald-50'
        : 'text-rose-600 bg-rose-50',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header sambutan */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-indigo-100 mb-1">
              {format(today, 'EEEE, d MMMM yyyy', { locale: localeId })}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold">
              Selamat datang, {teacher.name || 'Bapak/Ibu Guru'}
            </h2>
            <p className="text-sm text-indigo-100 mt-1">
              Berikut ringkasan jurnal kegiatan Anda
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
            <Clock className="w-4 h-4 text-indigo-100" />
            <div>
              <p className="text-[10px] text-indigo-100 uppercase tracking-wide">
                Hari Kerja
              </p>
              <p className="text-xs font-semibold">
                {isTodayWorkday ? 'Aktif' : 'Libur / Weekend'}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Status Verifikasi */}
      {!loadingVerif && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                📋 Status Verifikasi {format(today, 'MMMM yyyy', { locale: localeId })}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alur: Guru → Kepala Sekolah → Pengawas
              </p>
            </div>
            {!verification?.guruSubmittedAt && filledDays > 0 && (
              <button
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const { data: { user } } = await (await import('../../lib/supabase')).supabase.auth.getUser();
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                {submitting ? 'Mengirim...' : '📤 Kirim ke Kepala Sekolah'}
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</div>
              <span className="text-sm text-slate-700">Jurnal diisi ({filledDays}/{requiredDays} hari)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${verification?.guruSubmittedAt ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {verification?.guruSubmittedAt ? '✓' : '○'}
              </div>
              <span className={`text-sm ${verification?.guruSubmittedAt ? 'text-slate-700' : 'text-slate-400'}`}>
                {verification?.guruSubmittedAt
                  ? `Dikirim ke Kepala Sekolah — ${format(parseISO(verification.guruSubmittedAt), 'd MMM yyyy', { locale: localeId })}`
                  : 'Belum dikirim ke Kepala Sekolah'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                verification?.kepsekStatus === 'approved' ? 'bg-emerald-500 text-white'
                : verification?.kepsekStatus === 'rejected' ? 'bg-rose-500 text-white'
                : 'bg-slate-200 text-slate-500'}`}>
                {verification?.kepsekStatus === 'approved' ? '✓' : verification?.kepsekStatus === 'rejected' ? '✕' : '○'}
              </div>
              <span className={`text-sm ${
                verification?.kepsekStatus === 'approved' ? 'text-slate-700'
                : verification?.kepsekStatus === 'rejected' ? 'text-rose-700'
                : 'text-slate-400'}`}>
                {verification?.kepsekStatus === 'approved'
                  ? `Diverifikasi Kepala Sekolah — ${verification.kepsekVerifiedAt ? format(parseISO(verification.kepsekVerifiedAt), 'd MMM yyyy', { locale: localeId }) : ''}`
                  : verification?.kepsekStatus === 'rejected'
                  ? `Ditolak Kepala Sekolah: ${verification.kepsekNote || 'Tidak ada catatan'}`
                  : 'Menunggu verifikasi Kepala Sekolah'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                verification?.pengawasStatus === 'approved' ? 'bg-emerald-500 text-white'
                : verification?.pengawasStatus === 'rejected' ? 'bg-rose-500 text-white'
                : 'bg-slate-200 text-slate-500'}`}>
                {verification?.pengawasStatus === 'approved' ? '✓' : verification?.pengawasStatus === 'rejected' ? '✕' : '○'}
              </div>
              <span className={`text-sm ${
                verification?.pengawasStatus === 'approved' ? 'text-slate-700'
                : verification?.pengawasStatus === 'rejected' ? 'text-rose-700'
                : 'text-slate-400'}`}>
                {verification?.pengawasStatus === 'approved'
                  ? `Disetujui Pengawas — ${verification.pengawasVerifiedAt ? format(parseISO(verification.pengawasVerifiedAt), 'd MMM yyyy', { locale: localeId }) : ''}`
                  : verification?.pengawasStatus === 'rejected'
                  ? `Ditolak Pengawas: ${verification.pengawasNote || 'Tidak ada catatan'}`
                  : 'Menunggu validasi Pengawas'}
              </span>
            </div>
          </div>

          {verification?.isLocked && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              🔒 Jurnal bulan ini terkunci. Hubungi Kepala Sekolah untuk revisi.
            </div>
          )}
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

      {/* 4 Kartu Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', s.color)}>
                {s.icon}
              </div>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {s.label}
            </p>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

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

      {/* Grafik 7 hari terakhir */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-slate-500" />
          <p className="font-semibold text-slate-800 text-sm">Aktivitas 7 Hari Terakhir</p>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {last7Days.map((d, i) => {
            const heightPercent = (d.count / maxCount) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all duration-300 min-h-[4px]',
                      d.count > 0
                        ? 'bg-gradient-to-t from-indigo-500 to-indigo-400'
                        : 'bg-slate-100'
                    )}
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    title={`${d.count} kegiatan`}
                  />
                </div>
                <p className="text-[10px] font-semibold text-slate-600">{d.label}</p>
                <p className="text-[10px] text-slate-400">{d.count}</p>
              </div>
            );
          })}
        </div>
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

      {/* Kartu kecil reward kalau lengkap */}
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