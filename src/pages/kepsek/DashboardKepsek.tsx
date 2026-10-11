import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, Clock, AlertCircle, Loader2, Send, RefreshCw, FileText,
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

export function DashboardKepsek({
  profile,
  teacher,
  journals = [],
  addNotification,
}: DashboardKepsekProps) {
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

  // Hitung hari kerja bulan ini
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

  // Jurnal kepsek bulan ini
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

  const isSentToPengawas = !!verification?.guruSubmittedAt;
  const isApprovedPengawas = verification?.pengawasStatus === 'approved';
  const isRejectedPengawas = verification?.pengawasStatus === 'rejected';

  return (
    <div className="space-y-4">

      {/* Kartu Status Jurnal Saya */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="mb-3">
          <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Status Jurnal Saya — {format(today, 'MMMM yyyy', { locale: localeId })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Alur: Kepala Sekolah → Pengawas Bina
          </p>
        </div>

        {loadingVerif ? (
          <div className="py-4 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0',
                myFilledDays > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              )}>
                {myFilledDays > 0 ? '✓' : '○'}
              </div>
              <span className="text-sm text-slate-700">
                Jurnal diisi: <span className="font-semibold">{myFilledDays}/{required}</span> hari ({myPercent}%)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0',
                isSentToPengawas ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              )}>
                {isSentToPengawas ? '✓' : '○'}
              </div>
              <span className={cn('text-sm', isSentToPengawas ? 'text-slate-700' : 'text-slate-400')}>
                {isSentToPengawas
                  ? `Dikirim ke Pengawas — ${verification?.guruSubmittedAt ? format(parseISO(verification.guruSubmittedAt), 'd MMM yyyy', { locale: localeId }) : ''}`
                  : 'Belum dikirim ke Pengawas'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0',
                isApprovedPengawas ? 'bg-emerald-500 text-white'
                  : isRejectedPengawas ? 'bg-rose-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              )}>
                {isApprovedPengawas ? '✓' : isRejectedPengawas ? '✕' : '○'}
              </div>
              <span className={cn(
                'text-sm',
                isApprovedPengawas ? 'text-slate-700'
                  : isRejectedPengawas ? 'text-rose-700'
                  : 'text-slate-400'
              )}>
                {isApprovedPengawas
                  ? `Disetujui Pengawas — ${verification?.pengawasVerifiedAt ? format(parseISO(verification.pengawasVerifiedAt), 'd MMM yyyy', { locale: localeId }) : ''}`
                  : isRejectedPengawas
                  ? `Ditolak Pengawas: ${verification?.pengawasNote || 'Tidak ada catatan'}`
                  : 'Menunggu validasi Pengawas'}
              </span>
            </div>
          </div>
        )}

        {/* Tombol Kirim ke Pengawas — full-width, konsisten dengan guru */}
        {!loadingVerif && !isSentToPengawas && myFilledDays > 0 && (
          <button
            onClick={handleKirimKePengawas}
            disabled={submitting}
            className="w-full mt-4 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Kirim Jurnal Bulan Ini ke Pengawas
              </>
            )}
          </button>
        )}

        {isApprovedPengawas && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
            ✅ Jurnal Anda sudah disetujui Pengawas. Anda dapat mencetak jurnal & rekomendasi di menu Preview & Cetak.
          </div>
        )}
      </div>

      {/* Statistik Guru Binaan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Total Guru
          </p>
          <p className="text-2xl font-bold text-slate-900">{loadingGurus ? '-' : stats.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Guru di sekolah</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Lengkap
          </p>
          <p className="text-2xl font-bold text-emerald-600">{loadingGurus ? '-' : stats.lengkap}</p>
          <p className="text-[11px] text-slate-500 mt-1">≥80% terisi</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Kurang
          </p>
          <p className="text-2xl font-bold text-amber-600">{loadingGurus ? '-' : stats.kurang}</p>
          <p className="text-[11px] text-slate-500 mt-1">40-79% terisi</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Perlu Perhatian
          </p>
          <p className="text-2xl font-bold text-rose-600">{loadingGurus ? '-' : stats.belum}</p>
          <p className="text-[11px] text-slate-500 mt-1">&lt;40% terisi</p>
        </div>
      </div>
    </div>
  );
}