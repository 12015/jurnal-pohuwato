import { useEffect, useState } from 'react';
import {
  ClipboardCheck, Loader2, CheckCircle2, XCircle, User, Calendar,
  RefreshCw, Users, Clock, AlertCircle, FileText, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  getPendingVerificationsForKepsek,
  approveKepsek,
  rejectKepsek,
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

function parsePeriodKey(key: string): string {
  const parts = key.split('-');
  if (parts[0] === 'm') {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[parseInt(parts[1])] || '-'} ${parts[2]}`;
  }
  return key;
}

export function AntrianVerifikasi({ profile, addNotification }: AntrianVerifikasiProps) {
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selected, setSelected] = useState<PendingVerification | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPendingVerificationsForKepsek(profile.workUnitBina || '');
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
  }, [profile.workUnitBina]);

  const filtered = pending.filter((v) => {
    if (filter === 'all') return true;
    return v.kepsekStatus === filter;
  });

  const stats = {
    total: pending.length,
    pending: pending.filter((v) => v.kepsekStatus === 'pending').length,
    approved: pending.filter((v) => v.kepsekStatus === 'approved').length,
    rejected: pending.filter((v) => v.kepsekStatus === 'rejected').length,
  };

  const openDetail = async (item: PendingVerification) => {
    setSelected(item);
    setRejectNote('');
    setLoadingDetail(true);
    try {
      // Parse periodKey: m-9-2026 → month=9, year=2026
      const parts = item.periodKey.split('-');
      const mIdx = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const js = await getJournalsByUser(item.guruId, mIdx, year);
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
        prev.map((p) =>
          p.id === item.id ? { ...p, kepsekStatus: 'approved' as const } : p
        )
      );
      setSelected(null);
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (item: PendingVerification) => {
    if (!rejectNote.trim()) {
      addNotification('Catatan wajib diisi untuk menolak', 'error');
      return;
    }
    setProcessing(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tidak login');
      await rejectKepsek(item.id, user.id, rejectNote);
      addNotification(`${item.guruName} ditolak dengan catatan`, 'success');
      setPending((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, kepsekStatus: 'rejected' as const, kepsekNote: rejectNote } : p
        )
      );
      setSelected(null);
      setRejectNote('');
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Antrian Verifikasi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verifikasi jurnal guru di sekolah Anda
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Segarkan
          </button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all',
            filter === 'all' ? 'border-indigo-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all',
            filter === 'pending' ? 'border-amber-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Menunggu</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all',
            filter === 'approved' ? 'border-emerald-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Disetujui</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</p>
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all',
            filter === 'rejected' ? 'border-rose-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide">Ditolak</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.rejected}</p>
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">
              {filter === 'pending' ? 'Tidak ada jurnal yang menunggu verifikasi' : 'Tidak ada data'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Guru yang mengirim jurnal akan muncul di sini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((v) => {
              const isPending = v.kepsekStatus === 'pending';
              const isApproved = v.kepsekStatus === 'approved';
              const isRejected = v.kepsekStatus === 'rejected';

              return (
                <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{v.guruName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      NIP {v.guruNip || '-'} · {v.guruPosition || '-'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      📅 {parsePeriodKey(v.periodKey)}
                      {v.guruSubmittedAt && (
                        <> · Dikirim {format(parseISO(v.guruSubmittedAt), 'd MMM yyyy', { locale: localeId })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Disetujui
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3" /> Ditolak
                      </span>
                    )}
                    <button
                      onClick={() => openDetail(v)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        isPending
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      )}
                    >
                      {isPending ? 'Verifikasi' : 'Lihat'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{selected.guruName}</p>
                <p className="text-xs text-slate-500">
                  NIP {selected.guruNip || '-'} · {parsePeriodKey(selected.periodKey)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetail ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Memuat jurnal...</p>
                </div>
              ) : journals.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Belum ada jurnal di periode ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journals.map((j) => (
                    <div key={j.id} className="border border-slate-200 rounded-lg p-3">
                      <p className="font-semibold text-sm text-slate-800 mb-2">
                        {format(parseISO(j.date), 'EEEE, d MMMM yyyy', { locale: localeId })}
                      </p>
                      <div className="space-y-2 ml-2">
                        {j.activities.map((act, i) => (
                          <div key={i} className="flex gap-3 text-xs text-slate-600">
                            <span className="font-mono text-slate-400 shrink-0 w-20">
                              {act.jam || '-'}
                            </span>
                            <div className="flex-1">
                              <span className="font-semibold">{act.jenisKegiatan || '-'}</span>
                              {act.agendaMapel && <span> · {act.agendaMapel}</span>}
                              {act.lokasiKelas && <span> · {act.lokasiKelas}</span>}
                              {act.kegiatanTujuan && (
                                <p className="text-slate-500 mt-0.5">{act.kegiatanTujuan}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Catatan reject (kalau status pending) */}
              {selected.kepsekStatus === 'pending' && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CATATAN (wajib diisi jika menolak)
                  </label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Contoh: Jurnal tanggal 3 Okt materinya kurang lengkap"
                  />
                </div>
              )}

              {selected.kepsekNote && selected.kepsekStatus === 'rejected' && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-xs font-semibold text-rose-800 mb-1">Catatan Penolakan:</p>
                  <p className="text-sm text-rose-700">{selected.kepsekNote}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {selected.kepsekStatus === 'pending' && (
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  onClick={() => handleReject(selected)}
                  disabled={processing === selected.id || !rejectNote.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processing === selected.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Tolak dengan Catatan
                </button>
                <button
                  onClick={() => handleApprove(selected)}
                  disabled={processing === selected.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processing === selected.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Verifikasi & Teruskan ke Pengawas
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}