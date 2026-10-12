import { useEffect, useMemo, useState } from 'react';
import {
  FileText, Activity, TrendingUp, CheckCircle2, AlertCircle,
  Plus, Award, Send, Loader2, Clock, Target, BarChart3, Calendar,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isWeekend, isSameDay, getMonth, getYear, isAfter,
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

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'slate';

const colorMap: Record<ColorKey, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
  purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', fg: 'text-indigo-600' },
  slate: { bg: 'bg-slate-100', fg: 'text-slate-500' },
};

function StatCard({
  icon, color, label, value, sub,
}: {
  icon: React.ReactNode;
  color: ColorKey;
  label: string;
  value: string | number;
  sub?: string;
}) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2.5 lg:p-3 flex items-center gap-2.5 lg:gap-3">
      <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <span className={c.fg}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight truncate">
          {label}
        </p>
        <p className="text-sm lg:text-base font-bold text-slate-900 leading-tight truncate">{value}</p>
        {sub && (
          <p className="text-[9px] lg:text-[10px] text-slate-400 leading-tight truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

interface WeeklyGroup {
  index: number;
  filledDays: number;
  totalWorkDays: number;
  percent: number;
  isFuture: boolean;
  status: 'lengkap' | 'kurang' | 'belum' | 'future';
}

export function DashboardGuru({
  journals,
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

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  const workDaysThisMonth = useMemo(
    () => daysInMonth.filter((d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd'))),
    [daysInMonth]
  );

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
  const tpgEligible = percent >= 80;

  const hasFilledToday = journals.some((j) => isSameDay(parseISO(j.date), today));
  const isTodayWorkday = !isWeekend(today) && !isHoliday(todayStr);

  const isSent = !!verification?.guruSubmittedAt;
  const isKepsekApproved = verification?.kepsekStatus === 'approved';
  const isKepsekRejected = verification?.kepsekStatus === 'rejected';
  const isPengawasApproved = verification?.pengawasStatus === 'approved';
  const isPengawasRejected = verification?.pengawasStatus === 'rejected';

  // Kelompok minggu: 1-7, 8-14, 15-21, 22-28, 29-31
  const weeklyGroups = useMemo<WeeklyGroup[]>(() => {
    const weeks: WeeklyGroup[] = [];
    const lastDay = monthEnd.getDate();
    const boundaries = [
      { start: 1, end: 7 },
      { start: 8, end: 14 },
      { start: 15, end: 21 },
      { start: 22, end: 28 },
      { start: 29, end: 31 },
    ];

    boundaries.forEach((b, idx) => {
      if (b.start > lastDay) return;
      const endDay = Math.min(b.end, lastDay);

      const daysInWeek = daysInMonth.filter((d) => {
        const dayNum = d.getDate();
        return dayNum >= b.start && dayNum <= endDay;
      });

      const workDays = daysInWeek.filter(
        (d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd'))
      );
      const filledInWeek = workDays.filter((d) =>
        monthJournals.some((j) => isSameDay(parseISO(j.date), d))
      );

      const totalWork = workDays.length;
      const filled = filledInWeek.length;
      const pct = totalWork > 0 ? Math.round((filled / totalWork) * 100) : 0;

      const lastDayOfWeek = daysInWeek[daysInWeek.length - 1];
      const isFuture = !!(lastDayOfWeek && isAfter(lastDayOfWeek, today));

      let status: 'lengkap' | 'kurang' | 'belum' | 'future';
      if (isFuture || totalWork === 0) status = 'future';
      else if (pct >= 80) status = 'lengkap';
      else if (pct >= 40) status = 'kurang';
      else status = 'belum';

      weeks.push({
        index: idx + 1,
        filledDays: filled,
        totalWorkDays: totalWork,
        percent: pct,
        isFuture,
        status,
      });
    });

    return weeks;
  }, [daysInMonth, monthJournals, monthEnd, today]);

  const maxWeekFilled = Math.max(1, ...weeklyGroups.map((w) => w.filledDays));
  const barScale = (count: number) => Math.max(6, (count / maxWeekFilled) * 100);

  const handleKirim = async () => {
    if (filledDays === 0) {
      alert('Belum ada jurnal bulan ini. Isi dulu minimal 1 jurnal.');
      return;
    }
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
  };

  const getWeekBarColor = (status: string) => {
    switch (status) {
      case 'lengkap':
        return 'bg-gradient-to-t from-emerald-500 to-emerald-400';
      case 'kurang':
        return 'bg-gradient-to-t from-amber-500 to-amber-400';
      case 'belum':
        return 'bg-gradient-to-t from-rose-500 to-rose-400';
      default:
        return 'bg-gradient-to-t from-slate-200 to-slate-100';
    }
  };

  const getWeekTextColor = (status: string) => {
    switch (status) {
      case 'lengkap':
        return 'text-emerald-700';
      case 'kurang':
        return 'text-amber-700';
      case 'belum':
        return 'text-rose-700';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="flex flex-col gap-2.5 lg:gap-3 lg:h-full lg:overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs text-slate-500">Jurnal Bulan Ini:</span>
          <span className="text-xs font-bold text-slate-700">
            {filledDays}/{requiredDays} ({percent}%)
          </span>
        </div>
        <div className="flex-1" />
        {!loadingVerif && isPengawasApproved && (
          <span className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold">
            ✅ Disetujui Pengawas
          </span>
        )}
        {!loadingVerif && isPengawasRejected && (
          <span className="text-[11px] px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-semibold">
            ❌ Ditolak Pengawas
          </span>
        )}
        {!loadingVerif && !isSent && filledDays > 0 && (
          <button
            onClick={handleKirim}
            disabled={submitting}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Kirim ke Kepala Sekolah
          </button>
        )}
        {!loadingVerif && isSent && !isPengawasApproved && !isPengawasRejected && (
          <span className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-semibold">
            📤 Terkirim
            {verification?.guruSubmittedAt
              ? ` ${format(parseISO(verification.guruSubmittedAt), 'd MMM', { locale: localeId })}`
              : ''}
          </span>
        )}
      </div>

      {/* 4 Kartu Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3 shrink-0">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          color="blue"
          label="Jurnal Diisi"
          value={`${filledDays}/${requiredDays}`}
          sub={`${percent}% kelengkapan`}
        />
        <StatCard
          icon={<Send className="w-5 h-5" />}
          color={isSent ? 'emerald' : 'amber'}
          label="Dikirim ke Kepsek"
          value={
            isSent && verification?.guruSubmittedAt
              ? format(parseISO(verification.guruSubmittedAt), 'd MMM', { locale: localeId })
              : 'Belum'
          }
          sub={isSent ? 'Sudah dikirim' : 'Belum dikirim'}
        />
        <StatCard
          icon={
            isKepsekApproved
              ? <CheckCircle2 className="w-5 h-5" />
              : isKepsekRejected
              ? <AlertCircle className="w-5 h-5" />
              : <Clock className="w-5 h-5" />
          }
          color={isKepsekApproved ? 'emerald' : isKepsekRejected ? 'rose' : 'amber'}
          label="Verifikasi Kepsek"
          value={
            isKepsekApproved ? 'Disetujui' : isKepsekRejected ? 'Ditolak' : 'Menunggu'
          }
          sub={
            isKepsekApproved
              ? 'Siap cetak jurnal'
              : isKepsekRejected
              ? 'Perlu revisi'
              : 'Menunggu verifikasi'
          }
        />
        <StatCard
          icon={
            isPengawasApproved
              ? <Award className="w-5 h-5" />
              : isPengawasRejected
              ? <AlertCircle className="w-5 h-5" />
              : <Target className="w-5 h-5" />
          }
          color={isPengawasApproved ? 'emerald' : isPengawasRejected ? 'rose' : 'amber'}
          label="Final Pengawas"
          value={
            isPengawasApproved ? 'Disetujui' : isPengawasRejected ? 'Ditolak' : 'Menunggu'
          }
          sub={
            isPengawasApproved
              ? 'Siap cetak rekomendasi'
              : isPengawasRejected
              ? 'Perlu revisi'
              : 'Menunggu persetujuan'
          }
        />
      </div>

      {/* Chart + Ringkasan (grid 2:3) */}
      <div className="flex flex-col lg:flex-1 lg:min-h-0 gap-2 lg:gap-2.5">
        <div className="flex items-center gap-2 px-1 shrink-0">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <p className="font-semibold text-slate-800 text-xs lg:text-sm">Kelengkapan per Minggu</p>
          <span className="ml-auto text-[10px] text-slate-500">
            {format(today, 'MMMM yyyy', { locale: localeId })} · {requiredDays} hari kerja
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 lg:p-4 flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:flex-1 lg:min-h-0">
            {/* Kiri: Chart batang */}
            <div className="lg:col-span-2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-4 lg:min-h-0">
              <div className="flex items-end justify-around gap-2 h-32 lg:h-full relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-dashed border-slate-100"></div>
                  <div className="border-t border-dashed border-slate-100"></div>
                  <div className="border-t border-dashed border-slate-100"></div>
                  <div className="border-t border-slate-200"></div>
                </div>

                {weeklyGroups.map((w) => (
                  <div
                    key={w.index}
                    className="flex-1 flex flex-col items-center justify-end relative z-10 h-full"
                    title={`Minggu ${w.index}: ${w.filledDays}/${w.totalWorkDays} hari`}
                  >
                    <span className={`text-[10px] lg:text-xs font-bold ${getWeekTextColor(w.status)} mb-1`}>
                      {w.isFuture ? '-' : w.filledDays}
                    </span>
                    <div
                      className={`w-full max-w-[40px] ${getWeekBarColor(w.status)} rounded-t-md shadow-sm transition-all`}
                      style={{ height: `${w.filledDays > 0 ? barScale(w.filledDays) : 3}%` }}
                    ></div>
                    <p className="text-[9px] lg:text-[10px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">
                      M{w.index}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-2 lg:mt-3">
                Tinggi batang = jumlah hari terisi
              </p>
            </div>

            {/* Kanan: 4 kartu ringkasan dalam 2x2 grid */}
            <div className="lg:col-span-3 flex flex-col lg:min-h-0">
              <div className="grid grid-cols-2 gap-2.5 lg:gap-3 flex-1">
                <StatCard
                  icon={<Activity className="w-5 h-5" />}
                  color="purple"
                  label="Total Kegiatan"
                  value={totalActivities}
                  sub="Bulan ini"
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  color={percent >= 80 ? 'emerald' : percent >= 40 ? 'amber' : 'rose'}
                  label="Kelengkapan"
                  value={`${percent}%`}
                  sub={percent >= 80 ? 'Baik' : 'Perlu dilengkapi'}
                />
                <StatCard
                  icon={<Target className="w-5 h-5" />}
                  color={tpgEligible ? 'emerald' : 'rose'}
                  label="Status TPG"
                  value={tpgEligible ? 'Memenuhi' : 'Belum'}
                  sub={tpgEligible ? '≥80% tercapai' : 'Minimal 80%'}
                />
                <StatCard
                  icon={<Calendar className="w-5 h-5" />}
                  color="indigo"
                  label="Hari Aktif"
                  value={`${filledDays} hari`}
                  sub={format(today, 'MMM yyyy', { locale: localeId })}
                />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              Lengkap (≥80%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              Kurang (40-79%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500"></span>
              Belum (&lt;40%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-200"></span>
              Belum Lewat
            </span>
          </div>
        </div>
      </div>

      {/* Reminder / Reward */}
      {isTodayWorkday && !hasFilledToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          <div className="flex items-start gap-2.5 flex-1">
            <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
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
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Isi Sekarang
          </button>
        </div>
      )}

      {percent >= 80 && isTodayWorkday && hasFilledToday && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-3 flex items-center gap-3 shadow-sm shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
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
