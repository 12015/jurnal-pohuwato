import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare, Loader2, CheckCircle2, XCircle, Users, RefreshCw,
  Inbox, X, AlertCircle,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend,
  getMonth, getYear,
} from 'date-fns';
import {
  getAllBinaan, setApprovalForUser, getBatchBinaanStats, rejectPengawasApproval,
  type BinaanSummary,
} from '../../lib/db';
import type { UserProfile } from '../../types';
import { isHoliday } from '../../lib/holidays';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface PersetujuanProps {
  profile: UserProfile;
  addNotification: (message: string, type: 'success' | 'error') => void;
}

interface BinaanApprovalRow extends BinaanSummary {
  filledCount: number;
  percent: number;
  eligible: boolean;
  approved: boolean;
  kepsekStatus: 'pending' | 'approved' | 'rejected';
  kepsekApproved: boolean;
  hasSubmitted: boolean;
  pengawasStatus: 'pending' | 'approved' | 'rejected';
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function Persetujuan({ profile, addNotification }: PersetujuanProps) {
  const now = new Date();
  const [rows, setRows] = useState<BinaanApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BinaanApprovalRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const [filterMonth, setFilterMonth] = useState<number>(getMonth(now));
  const [filterYear, setFilterYear] = useState<number>(getYear(now));

  const required = useMemo(() => {
    const start = startOfMonth(new Date(filterYear, filterMonth));
    const end = endOfMonth(new Date(filterYear, filterMonth));
    return eachDayOfInterval({ start, end }).filter(
      (d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd'))
    ).length;
  }, [filterMonth, filterYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const npsnList = profile.npsnBinaList || (profile.npsnBina ? [profile.npsnBina] : []);
      const binaan = await getAllBinaan(npsnList);
      const userIds = binaan.map((b) => b.userId);
      const statsMap = await getBatchBinaanStats(userIds, filterMonth, filterYear);

      const enriched: BinaanApprovalRow[] = binaan.map((b) => {
        const stats = statsMap.get(b.userId);
        const filledCount = stats?.journalCount || 0;
        const percent = required > 0 ? Math.round((filledCount / required) * 100) : 0;
        const eligible = percent >= 80;
        const approved = stats?.approved || false;
        const kepsekStatus = stats?.kepsekStatus || 'pending';
        const pengawasStatus = stats?.pengawasStatus || 'pending';
        const hasSubmitted = kepsekStatus === 'approved' || pengawasStatus === 'approved';

        return {
          ...b,
          filledCount,
          percent,
          eligible,
          approved,
          kepsekStatus,
          kepsekApproved: kepsekStatus === 'approved',
          hasSubmitted,
          pengawasStatus,
        };
      });
      setRows(enriched);
    } catch (e) {
      console.error(e);
      addNotification('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.npsnBinaList, profile.npsnBina, filterMonth, filterYear]);

  // Filter yang tampil:
  // - Guru   : sudah diverifikasi kepsek
  // - Kepsek : sudah kirim ke pengawas
  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.role === 'guru') return r.kepsekApproved;
      if (r.role === 'kepala_sekolah') return r.hasSubmitted;
      return false;
    });
  }, [rows]);

  const handleApprove = async (row: BinaanApprovalRow) => {
    setProcessingId(row.userId);
    try {
      const monthKey = `m-${filterMonth}-${filterYear}`;
      await setApprovalForUser(row.userId, monthKey, !row.approved);
      setRows((prev) =>
        prev.map((r) => (r.userId === row.userId ? { ...r, approved: !r.approved } : r))
      );
      addNotification(
        row.approved
          ? `Persetujuan ${row.name} dibatalkan`
          : `Rekomendasi ${row.name} berhasil disetujui`,
        'success'
      );
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget || !rejectNote.trim()) return;
    setProcessingId(rejectTarget.userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tidak login');
      const monthKey = `m-${filterMonth}-${filterYear}`;
      await rejectPengawasApproval(rejectTarget.userId, monthKey, user.id, rejectNote);
      setRows((prev) =>
        prev.map((r) =>
          r.userId === rejectTarget.userId
            ? { ...r, approved: false, pengawasStatus: 'rejected' as const }
            : r
        )
      );
      addNotification(`Rekomendasi ${rejectTarget.name} ditolak`, 'success');
      setRejectTarget(null);
      setRejectNote('');
    } catch (e) {
      console.error(e);
      addNotification('Gagal menolak: ' + (e as Error).message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const stats = useMemo(() => {
    return {
      total: rows.length,
      approved: visibleRows.filter((r) => r.approved).length,
      readyToApprove: visibleRows.filter((r) => r.eligible && !r.approved).length,
      notEligible: visibleRows.filter((r) => !r.eligible && !r.approved).length,
      waiting: rows.length - visibleRows.length,
    };
  }, [rows, visibleRows]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              Verifikasi Rekomendasi
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Setujui rekomendasi guru (yang sudah diverifikasi Kepsek) dan Kepsek binaan
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Total Binaan</p>
          <p className="text-xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">Disetujui</p>
          <p className="text-xl font-bold text-emerald-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Siap Disetujui</p>
          <p className="text-xl font-bold text-amber-600">{stats.readyToApprove}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-0.5">Menunggu</p>
          <p className="text-xl font-bold text-slate-600">{stats.waiting}</p>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-200">
          <p className="font-semibold text-slate-800 text-sm">
            Daftar Verifikasi Rekomendasi - {months[filterMonth]} {filterYear}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {required} hari kerja · Target minimal 80%
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 text-sm">Belum ada binaan</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 text-sm">
              Belum ada rekomendasi yang bisa diverifikasi
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Daftar ini otomatis terisi ketika Kepala Sekolah memverifikasi jurnal guru,
              atau ketika Kepala Sekolah mengirim jurnalnya sendiri ke pengawas.
            </p>
            {stats.waiting > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                {stats.waiting} binaan menunggu proses di tahap sebelumnya.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-3 font-bold text-slate-700 text-xs uppercase">Nama</th>
                  <th className="text-left px-3 py-3 font-bold text-slate-700 text-xs uppercase">Sekolah</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-700 text-xs uppercase">Jabatan</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-700 text-xs uppercase">Kelengkapan</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-700 text-xs uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((r) => (
                  <tr key={r.userId} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                          {r.profilePhoto ? (
                            <img src={r.profilePhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-slate-400 font-bold text-xs">
                              {r.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">
                            {r.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p className="font-medium text-slate-700 truncate max-w-[200px]">
                        {r.namaSekolah || r.workUnit || '-'}
                      </p>
                      {r.npsn && (
                        <p className="text-[10px] text-slate-400 font-mono">NPSN {r.npsn}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.role === 'kepala_sekolah' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Kepala Sekolah
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Guru
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <p className={cn(
                        'text-base font-bold leading-tight',
                        r.percent >= 80 ? 'text-emerald-600' : r.percent >= 40 ? 'text-amber-600' : 'text-rose-600'
                      )}>
                        {r.percent}%
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {r.filledCount} dari {required} hari
                      </p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setRejectTarget(r);
                            setRejectNote('');
                          }}
                          disabled={processingId === r.userId}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-40"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Tolak
                        </button>
                        <button
                          onClick={() => handleApprove(r)}
                          disabled={processingId === r.userId || (!r.approved && !r.eligible)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                            r.approved
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          )}
                          title={!r.approved && !r.eligible ? 'Belum memenuhi syarat kelengkapan' : ''}
                        >
                          {processingId === r.userId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {r.approved ? 'Batal' : 'Approve'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tolak */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">Tolak Rekomendasi?</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {rejectTarget.name} — {rejectTarget.namaSekolah || rejectTarget.workUnit}
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
                placeholder="Contoh: Jurnal beberapa hari belum lengkap, mohon diperbaiki."
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
                disabled={!rejectNote.trim() || processingId === rejectTarget.userId}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5"
              >
                {processingId === rejectTarget.userId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Tolak Rekomendasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
