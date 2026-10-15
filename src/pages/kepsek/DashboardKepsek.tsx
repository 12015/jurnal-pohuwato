import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle,
  Loader2, School, TrendingUp, Award, FileText, Target, Send,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend,
  getMonth, getYear,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  getGuruBinaan,
  getVerificationStatus,
  submitKepsekJournal,
  type GuruBinaanSummary,
  type VerificationStatus,
} from '../../lib/db';
import { supabase } from '../../lib/supabase';
import type { TeacherData, UserProfile } from '../../types';
import { isHoliday } from '../../lib/holidays';
import { cn } from '../../lib/utils';

interface DashboardKepsekProps {
  profile: UserProfile;
  teacher: TeacherData;
  journals?: any[];
  addNotification?: (message: string, type: 'success' | 'error') => void;
}

type StatusType = 'lengkap' | 'kurang' | 'belum';

function getStatus(count: number, required: number): StatusType {
  if (required === 0) return 'belum';
  const percent = (count / required) * 100;
  if (percent >= 80) return 'lengkap';
  if (percent >= 40) return 'kurang';
  return 'belum';
}

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';

const colorMap: Record<ColorKey, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
  purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', fg: 'text-indigo-600' },
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
        <p className="text-base lg:text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
        {sub && (
          <p className="text-[9px] lg:text-[10px] text-slate-400 leading-tight truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

export function DashboardKepsek({
  profile,
  teacher,
  journals = [],
  addNotification,
}: DashboardKepsekProps) {
  void teacher;
  const today = new Date();
  const monthIdx = getMonth(today);
  const yearNow = getYear(today);

  const [gurus, setGurus] = useState<GuruBinaanSummary[]>([]);
  const [loadingGurus, setLoadingGurus] = useState(true);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [loadingVerif, setLoadingVerif] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const notify = addNotification || ((msg: string, type: 'success' | 'error') => {
    if (type === 'error') console.error(msg);
    else console.log(msg);
  });

  const workDaysThisMonth = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today),
  }).filter((d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd')));
  const required = workDaysThisMonth.length;

  const fetchGurus = async () => {
    setLoadingGurus(true);
    try {
      const data = await getGuruBinaan(profile.npsnBina ? [profile.npsnBina] : []);
      setGurus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGurus(false);
    }
  };

  const fetchVerification = async () => {
    setLoadingVerif(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const periodKey = `m-${monthIdx}-${yearNow}`;
      const v = await getVerificationStatus(user.id, periodKey);
      setVerification(v);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVerif(false);
    }
  };

  useEffect(() => {
    fetchGurus();
    fetchVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.npsnBina]);

  const myJournals = journals.filter((j: any) => {
    const d = parseISO(j.date);
    return getMonth(d) === monthIdx && getYear(d) === yearNow;
  });

  const myFilledDays = myJournals.length;
  const myPercent = required > 0 ? Math.round((myFilledDays / required) * 100) : 0;

  const handleKirimKePengawas = async () => {
    if (myFilledDays === 0) {
      notify('Belum ada jurnal bulan ini. Isi dulu minimal 1 jurnal.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tidak login');
      const periodKey = `m-${monthIdx}-${yearNow}`;
      await submitKepsekJournal(user.id, periodKey);
      const v = await getVerificationStatus(user.id, periodKey);
      setVerification(v);
      notify('Jurnal berhasil dikirim ke Pengawas!', 'success');
    } catch (e) {
      console.error(e);
      notify('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: gurus.length,
    lengkap: gurus.filter((g) => getStatus(g.journalCount, required) === 'lengkap').length,
    kurang: gurus.filter((g) => getStatus(g.journalCount, required) === 'kurang').length,
    belum: gurus.filter((g) => getStatus(g.journalCount, required) === 'belum').length,
  };

  const avgPercent = gurus.length > 0
    ? Math.round(gurus.reduce((sum, g) => sum + (required > 0 ? (g.journalCount / required) * 100 : 0), 0) / gurus.length)
    : 0;
  const totalJournals = gurus.reduce((sum, g) => sum + g.journalCount, 0);
  const belumIsi = gurus.filter((g) => g.journalCount === 0).length;
  const guruTerbaik = [...gurus].sort((a, b) => b.journalCount - a.journalCount)[0];

  const isSentToPengawas = !!verification?.guruSubmittedAt;
  const isApprovedPengawas = verification?.pengawasStatus === 'approved';
  const isRejectedPengawas = verification?.pengawasStatus === 'rejected';

  const maxCount = Math.max(1, stats.lengkap, stats.kurang, stats.belum);
  const barScale = (count: number) => Math.max(6, (count / maxCount) * 100);

  return (
    <div className="flex flex-col gap-2.5 lg:gap-3 lg:h-full lg:overflow-hidden">
      {/* Toolbar Jurnal Saya */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs text-slate-500">Jurnal Saya:</span>
          <span className="text-xs font-bold text-slate-700">
            {myFilledDays}/{required} ({myPercent}%)
          </span>
        </div>
        <div className="flex-1" />
        {!loadingVerif && isApprovedPengawas && (
          <span className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold">
            ✅ Disetujui Pengawas
          </span>
        )}
        {!loadingVerif && isRejectedPengawas && (
          <span className="text-[11px] px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-semibold">
            ❌ Ditolak Pengawas
          </span>
        )}
        {!loadingVerif && (!isSentToPengawas || isRejectedPengawas) && (
          <button
            onClick={handleKirimKePengawas}
            disabled={submitting}
            className={cn(
              'px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5',
              isRejectedPengawas
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            )}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {isRejectedPengawas ? 'Kirim Ulang ke Pengawas' : 'Kirim Jurnal ke Pengawas'}
          </button>
        )}
      </div>

            {/* Notifikasi Penolakan dari Pengawas */}
      {!loadingVerif && isRejectedPengawas && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-start gap-3 shrink-0">
          <div className="flex items-start gap-2.5 flex-1">
            <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-rose-900 text-sm">
                Jurnal Anda Ditolak oleh Pengawas
              </p>
              {verification?.pengawasNote ? (
                <div className="mt-1.5 p-2 bg-white/60 border border-rose-200 rounded-md">
                  <p className="text-[11px] font-semibold text-rose-800 mb-0.5">Catatan Pengawas:</p>
                  <p className="text-xs text-rose-700 italic">"{verification.pengawasNote}"</p>
                </div>
              ) : (
                <p className="text-xs text-rose-700 mt-0.5">
                  Silakan perbaiki jurnal Anda, lalu kirim ulang.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

{/* 4 kartu info guru */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3 shrink-0">
        <StatCard icon={<Users className="w-5 h-5" />} color="blue"
          label="Total Guru" value={loadingGurus ? '—' : stats.total} sub="Di sekolah" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} color="emerald"
          label="Lengkap" value={loadingGurus ? '—' : stats.lengkap} sub="≥80% terisi" />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} color="amber"
          label="Kurang" value={loadingGurus ? '—' : stats.kurang} sub="40-79% terisi" />
        <StatCard icon={<XCircle className="w-5 h-5" />} color="rose"
          label="Belum" value={loadingGurus ? '—' : stats.belum} sub="<40% terisi" />
      </div>

      {/* Chart + mini list */}
      <div className="flex flex-col lg:flex-1 lg:min-h-0 gap-2 lg:gap-2.5">
        <div className="flex items-center gap-2 px-1 shrink-0">
          <School className="w-4 h-4 text-indigo-600" />
          <p className="font-semibold text-slate-800 text-xs lg:text-sm">Kelengkapan Jurnal Guru</p>
          <span className="ml-auto text-[10px] text-slate-500">
            {format(today, 'MMMM yyyy', { locale: localeId })} · {required} hari kerja
          </span>
        </div>

        {loadingGurus ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Memuat data...</p>
            </div>
          </div>
        ) : gurus.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex items-center justify-center">
            <div className="text-center">
              <School className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Belum ada guru di sekolah ini</p>
              <p className="text-xs text-slate-400 mt-1">
                Guru yang mendaftar dengan NPSN sekolah Anda akan muncul di sini.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 lg:p-4 flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:flex-1 lg:min-h-0">
              {/* Kiri: chart */}
              <div className="lg:col-span-2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-4 lg:min-h-0">
                <div className="flex items-end justify-around gap-2 h-28 lg:h-full relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-t border-dashed border-slate-100"></div>
                    <div className="border-t border-dashed border-slate-100"></div>
                    <div className="border-t border-slate-200"></div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                    <span className="text-sm font-bold text-emerald-700 mb-1">{stats.lengkap}</span>
                    <div className="w-full max-w-[44px] bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md shadow-sm"
                      style={{ height: `${stats.lengkap > 0 ? barScale(stats.lengkap) : 3}%` }}></div>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">Lengkap</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                    <span className="text-sm font-bold text-amber-700 mb-1">{stats.kurang}</span>
                    <div className="w-full max-w-[44px] bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md shadow-sm"
                      style={{ height: `${stats.kurang > 0 ? barScale(stats.kurang) : 3}%` }}></div>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">Kurang</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                    <span className="text-sm font-bold text-rose-700 mb-1">{stats.belum}</span>
                    <div className="w-full max-w-[44px] bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-md shadow-sm"
                      style={{ height: `${stats.belum > 0 ? barScale(stats.belum) : 3}%` }}></div>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">Belum</p>
                  </div>
                </div>
              </div>

              {/* Kanan: mini list guru */}
              <div className="lg:col-span-3 flex flex-col lg:min-h-0">
                <div className="flex-1 lg:overflow-y-auto lg:min-h-0 lg:pr-1 space-y-2">
                  {gurus.map((g) => {
                    const percent = required > 0 ? Math.round((g.journalCount / required) * 100) : 0;
                    const barColor = percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500';
                    const txtColor = percent >= 80 ? 'text-emerald-700' : percent >= 40 ? 'text-amber-700' : 'text-rose-700';
                    return (
                      <div key={g.userId} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="flex-1 text-xs text-slate-700 truncate font-medium">{g.name}</p>
                            <p className={`text-[10px] font-bold shrink-0 ${txtColor}`}>
                              {g.journalCount}/{required} ({percent}%)
                            </p>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ringkasan Sekolah */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-2 px-1">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <p className="font-semibold text-slate-800 text-xs lg:text-sm">Ringkasan Sekolah</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
          <StatCard icon={<TrendingUp className="w-5 h-5" />} color="indigo"
            label="Rata-rata Kelengkapan" value={loadingGurus ? '—' : `${avgPercent}%`}
            sub="Semua guru" />
          <StatCard icon={<FileText className="w-5 h-5" />} color="purple"
            label="Total Jurnal Bulan Ini" value={loadingGurus ? '—' : totalJournals}
            sub={`Dari ${stats.total} guru`} />
          <StatCard icon={<Target className="w-5 h-5" />}
            color={belumIsi > 0 ? 'rose' : 'emerald'}
            label="Belum Isi Sama Sekali" value={loadingGurus ? '—' : belumIsi}
            sub="Perlu ditindaklanjuti" />
          <StatCard icon={<Award className="w-5 h-5" />} color="emerald"
            label="Guru Terbaik"
            value={loadingGurus ? '—' : guruTerbaik?.name || '—'}
            sub={guruTerbaik ? `${guruTerbaik.journalCount}/${required} hari` : ''} />
        </div>
      </div>
    </div>
  );
}
