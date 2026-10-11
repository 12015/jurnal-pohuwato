import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, Clock, AlertCircle, Loader2, Send, FileText, BarChart3,
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

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';

const colorMap: Record<ColorKey, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
  slate: { bg: 'bg-slate-100', fg: 'text-slate-500' },
  purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
};

function SmallCard({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: ColorKey;
  label: string;
  value: string | number;
}) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <span className={c.fg}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight truncate">
          {label}
        </p>
        <p className="text-lg font-bold text-slate-900 leading-tight truncate">
          {value}
        </p>
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
  }, [profile.workUnitBina]);

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

  const perluPerhatian = stats.kurang + stats.belum;

  const isSentToPengawas = !!verification?.guruSubmittedAt;
  const isApprovedPengawas = verification?.pengawasStatus === 'approved';
  const isRejectedPengawas = verification?.pengawasStatus === 'rejected';

  return (
    <div className="space-y-3">
      {/* Toolbar tipis */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-slate-500">
          {format(today, 'MMMM yyyy', { locale: localeId })} · Jurnal diisi{' '}
          <span className="font-semibold text-slate-700">{myFilledDays}/{required} ({myPercent}%)</span>
        </p>
        {!loadingVerif && !isSentToPengawas && myFilledDays > 0 && (
          <button
            onClick={handleKirimKePengawas}
            disabled={submitting}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Kirim Jurnal ke Pengawas
          </button>
        )}
        {isApprovedPengawas && (
          <span className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold">
            ✅ Disetujui Pengawas
          </span>
        )}
        {isRejectedPengawas && (
          <span className="text-[11px] px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-semibold">
            ❌ Ditolak Pengawas
          </span>
        )}
      </div>

      {/* Grid kartu - 2 kolom seimbang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SmallCard
          icon={<FileText className="w-5 h-5" />}
          color="blue"
          label="Jurnal Diisi"
          value={`${myFilledDays}/${required} (${myPercent}%)`}
        />
        <SmallCard
          icon={<Send className="w-5 h-5" />}
          color={isSentToPengawas ? 'emerald' : 'slate'}
          label="Dikirim ke Pengawas"
          value={
            isSentToPengawas && verification?.guruSubmittedAt
              ? format(parseISO(verification.guruSubmittedAt), 'd MMM yyyy', { locale: localeId })
              : 'Belum'
          }
        />
        <SmallCard
          icon={
            isApprovedPengawas ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isRejectedPengawas ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )
          }
          color={isApprovedPengawas ? 'emerald' : isRejectedPengawas ? 'rose' : 'amber'}
          label="Verifikasi Pengawas"
          value={
            isApprovedPengawas ? 'Disetujui' : isRejectedPengawas ? 'Ditolak' : 'Menunggu'
          }
        />
        <SmallCard
          icon={<Users className="w-5 h-5" />}
          color="purple"
          label="Total Guru"
          value={loadingGurus ? '—' : stats.total}
        />
        <SmallCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          label="Guru Sudah Lengkap"
          value={loadingGurus ? '—' : `${stats.lengkap} dari ${stats.total}`}
        />
        <SmallCard
          icon={<AlertCircle className="w-5 h-5" />}
          color={perluPerhatian > 0 ? 'rose' : 'slate'}
          label="Guru Perlu Perhatian"
          value={loadingGurus ? '—' : `${perluPerhatian} dari ${stats.total}`}
        />
      </div>

      {/* Chart: Kelengkapan Jurnal per Guru */}
      {!loadingGurus && gurus.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-bold text-slate-800">Kelengkapan Jurnal Guru</p>
            <span className="text-[10px] text-slate-500 ml-auto">
              Bulan {format(today, 'MMMM yyyy', { locale: localeId })}
            </span>
          </div>
          <div className="space-y-2.5">
            {gurus.map((g) => {
              const percent = required > 0 ? Math.round((g.journalCount / required) * 100) : 0;
              const barColor =
                percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <div key={g.userId}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-700 truncate">{g.name}</p>
                    <p className="text-xs text-slate-500 shrink-0">
                      <span className="font-bold text-slate-800">{g.journalCount}</span>/{required} ({percent}%)
                    </p>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ≥ 80%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 40-79%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> &lt; 40%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
