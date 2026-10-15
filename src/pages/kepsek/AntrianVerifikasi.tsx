import { useEffect, useState } from 'react';
import {
  Loader2, CheckCircle2, XCircle, RefreshCw,
  X, Calendar, Eye,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  getPendingVerificationsForKepsek,
  approveKepsek,
  rejectKepsek,
  resetKepsekStatus,
  getJournalsByUser,
  type PendingVerification,
} from '../../lib/db';
import { supabase } from '../../lib/supabase';
import type { UserProfile, JournalEntry } from '../../types';
import { cn } from '../../lib/utils';

interface AntrianVerifikasiProps {
  profile: UserProfile;
  addNotification: (message: string, type: 'success' | 'error') => void;
}

const monthsFull = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function parsePeriodKey(key: string): string {
  const parts = key.split('-');
  if (parts[0] === 'm') {
    return `${monthsFull[parseInt(parts[1])] || '-'} ${parts[2]}`;
  }
  return key;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function AntrianVerifikasi({ profile, addNotification }: AntrianVerifikasiProps) {
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const [viewTarget, setViewTarget] = useState<PendingVerification | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<PendingVerification | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [resetTarget, setResetTarget] = useState<PendingVerification | null>(null);

  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPendingVerificationsForKepsek(profile.npsnBina || '');
      setPending(data);
    } catch (e) {
      console.error(e);
      addNotification('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.npsnBina]);

  const filtered = filter === 'all'
    ? pending
    : pending.filter((v) => v.kepsekStatus === filter);

  const stats = {
    total: pending.length,
    pending: pending.filter((v) => v.kepsekStatus === 'pending').length,
    approved: pending.filter((v) => v.kepsekStatus === 'approved').length,
    rejected: pending.filter((v) => v.kepsekStatus === 'rejected').length,
  };

  const handleOpenView = async (item: PendingVerification) => {
    setViewTarget(item);
    setLoadingDetail(true);
    try {
      const parts = item.periodKey.split('-');
      const mIdx = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const js = await getJournalsByUser(item.guruId, mIdx, year);
      js.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      setJournals(js);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprove = async (item: PendingVerification) => {
    setProcessing(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tidak login');
      await approveKepsek(item.id, user.id);
      addNotification(`${item.guruName} berhasil diverifikasi`, 'success');
      setPending((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, kepsekStatus: 'approved' as const } : p))
      );
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setProcessing(resetTarget.id);
    try {
      await resetKepsekStatus(resetTarget.id);
      addNotification(`Keputusan ${resetTarget.guruName} direset ke Menunggu`, 'success');
      setPending((prev) =>
        prev.map((p) =>
          p.id === resetTarget.id
            ? { ...p, kepsekStatus: 'pending' as const, kepsekNote: undefined }
            : p
        )
      );
      setResetTarget(null);
    } catch (e) {
      console.error(e);
      addNotification('Gagal reset: ' + (e as Error).message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget || !rejectNote.trim()) return;
    setProcessing(rejectTarget.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tidak login');
      await rejectKepsek(rejectTarget.id, user.id, rejectNote);
      addNotification(`${rejectTarget.guruName} ditolak dengan catatan`, 'success');
      setPending((prev) =>
        prev.map((p) =>
          p.id === rejectTarget.id
            ? { ...p, kepsekStatus: 'rejected' as const, kepsekNote: rejectNote }
            : p
        )
      );
      setRejectTarget(null);
      setRejectNote('');
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* 4 Kartu Informasi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'all' ? 'border-indigo-500' : 'border-slate-200'
          )}
        >
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total Guru</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'pending' ? 'border-amber-500' : 'border-slate-200'
          )}
        >
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Menunggu</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{stats.pending}</p>
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'approved' ? 'border-emerald-500' : 'border-slate-200'
          )}
        >
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Disetujui</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{stats.approved}</p>
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'rejected' ? 'border-rose-500' : 'border-slate-200'
          )}
        >
          <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide">Ditolak</p>
          <p className="text-xl font-bold text-rose-600 mt-0.5">{stats.rejected}</p>
        </button>
      </div>

      {/* Toolbar tipis */}
      <div className="flex justify-end px-1">
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Segarkan
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 text-sm">
              {filter === 'pending' ? 'Tidak ada jurnal yang menunggu verifikasi' : 'Tidak ada data'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Guru yang mengirim jurnal akan muncul di sini
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">NIP</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => {
                  const isPending = v.kepsekStatus === 'pending';
                  const isApproved = v.kepsekStatus === 'approved';
                  const isRejected = v.kepsekStatus === 'rejected';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-slate-800 truncate">{v.guruName}</p>
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Disetujui
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-2.5 h-2.5" /> Ditolak
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Menunggu
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {v.guruPosition || '-'} · {parsePeriodKey(v.periodKey)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-700">
                        {v.guruNip || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenView(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat
                          </button>
                          {isPending && (
                            <>
                              <button
                                onClick={() => {
                                  setRejectTarget(v);
                                  setRejectNote('');
                                }}
                                disabled={processing === v.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-40"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                              <button
                                onClick={() => handleApprove(v)}
                                disabled={processing === v.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors disabled:opacity-40"
                              >
                                {processing === v.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                Approve
                              </button>
                            </>
                          )}
                          {!isPending && v.pengawasStatus !== 'approved' && (
                            <button
                              onClick={() => setResetTarget(v)}
                              disabled={processing === v.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors disabled:opacity-40"
                              title="Kembalikan ke Menunggu"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Batalkan
                            </button>
                          )}
                          {!isPending && v.pengawasStatus === 'approved' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500">
                              🔒 Final
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal LIHAT — 2 grid */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{viewTarget.guruName}</p>
                <p className="text-xs text-slate-500">
                  NIP {viewTarget.guruNip || '-'} · {parsePeriodKey(viewTarget.periodKey)}
                </p>
              </div>
              <button
                onClick={() => setViewTarget(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetail ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Memuat jurnal...</p>
                </div>
              ) : journals.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Belum ada jurnal di periode ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {journals.map((j) => (
                    <div key={j.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <p className="font-semibold text-sm text-slate-800 mb-2">
                        {format(parseISO(j.date), 'EEEE, d MMMM yyyy', { locale: localeId })}
                      </p>
                      <div className="space-y-2">
                        {j.activities.map((act, i) => (
                          <div key={i} className="flex gap-2 text-xs text-slate-600 border-l-2 border-indigo-200 pl-2">
                            <span className="font-mono text-slate-400 shrink-0 w-16">
                              {act.jam || '-'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-700 truncate">
                                {act.jenisKegiatan || '-'}
                              </p>
                              {(act.agendaMapel || act.lokasiKelas) && (
                                <p className="text-slate-500 text-[11px] truncate">
                                  {act.agendaMapel || ''}{act.agendaMapel && act.lokasiKelas ? ' · ' : ''}{act.lokasiKelas || ''}
                                </p>
                              )}
                              {act.kegiatanTujuan && (
                                <p className="text-slate-500 text-[11px] mt-0.5">
                                  {act.kegiatanTujuan}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal RESET */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">Batalkan Keputusan?</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {resetTarget.guruName} — {parsePeriodKey(resetTarget.periodKey)}
                </p>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 leading-relaxed">
                Status verifikasi akan dikembalikan ke <strong>Menunggu</strong>.
                Anda dapat memverifikasi ulang (Tolak/Approve) setelah ini.
              </p>
              <p className="text-[11px] text-amber-700 mt-1.5">
                ⚠️ Keputusan ini tidak bisa dibatalkan setelah Pengawas menyetujui.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setResetTarget(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                disabled={processing === resetTarget.id}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5"
              >
                {processing === resetTarget.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal TOLAK */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">Tolak Verifikasi?</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {rejectTarget.guruName} — {parsePeriodKey(rejectTarget.periodKey)}
                </p>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                CATATAN PENOLAKAN <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={4}
                placeholder="Contoh: Jurnal tanggal 3 Okt materinya kurang lengkap"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectNote.trim() || processing === rejectTarget.id}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5"
              >
                {processing === rejectTarget.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Tolak dengan Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
