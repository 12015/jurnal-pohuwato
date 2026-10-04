import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare, Loader2, CheckCircle2, XCircle, AlertCircle, Users,
  RefreshCw, Send,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend,
  getMonth, getYear,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  getGuruBinaan, getJournalsByUser, getApprovalsByUser, setApprovalForUser,
  type GuruBinaanSummary,
} from '../../lib/db';
import type { UserProfile } from '../../types';
import { HOLIDAYS_2026 } from '../../types';
import { cn } from '../../lib/utils';

interface PersetujuanProps {
  profile: UserProfile;
  addNotification: (message: string, type: 'success' | 'error') => void;
}

interface GuruApprovalRow extends GuruBinaanSummary {
  filledCount: number;
  percent: number;
  eligible: boolean;
  approved: boolean;
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function Persetujuan({ profile, addNotification }: PersetujuanProps) {
  const now = new Date();
  const [rows, setRows] = useState<GuruApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<number>(getMonth(now));
  const [filterYear, setFilterYear] = useState<number>(getYear(now));
  const [useTriwulan, setUseTriwulan] = useState(false);
  const [filterTriwulan, setFilterTriwulan] = useState<number>(
    Math.floor(getMonth(now) / 3) + 1
  );

  // Hari kerja bulan ini
  const required = useMemo(() => {
    const start = startOfMonth(new Date(filterYear, filterMonth));
    const end = endOfMonth(new Date(filterYear, filterMonth));
    return eachDayOfInterval({ start, end }).filter(
      (d) => !isWeekend(d) && !HOLIDAYS_2026.includes(format(d, 'yyyy-MM-dd'))
    ).length;
  }, [filterMonth, filterYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const gurus = await getGuruBinaan(profile.workUnitBina || '');
      const enriched: GuruApprovalRow[] = await Promise.all(
        gurus.map(async (g) => {
          const [journals, approvals] = await Promise.all([
            getJournalsByUser(g.userId, filterMonth, filterYear),
            getApprovalsByUser(g.userId),
          ]);
          const filledCount = journals.length;
          const percent = required > 0 ? Math.round((filledCount / required) * 100) : 0;
          const eligible = percent >= 80;

          const monthKey = `m-${filterMonth}-${filterYear}`;
          const q = Math.floor(filterMonth / 3) + 1;
          const triwulanKey = `q-${q}-${filterYear}`;
          const approved = useTriwulan
            ? approvals.includes(triwulanKey)
            : approvals.includes(monthKey);

          return { ...g, filledCount, percent, eligible, approved };
        })
      );
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
  }, [profile.workUnitBina, filterMonth, filterYear, useTriwulan, filterTriwulan]);

  const handleToggle = async (row: GuruApprovalRow) => {
    setProcessingId(row.userId);
    try {
      const monthKey = `m-${filterMonth}-${filterYear}`;
      const triwulanKey = `q-${filterTriwulan}-${filterYear}`;
      const key = useTriwulan ? triwulanKey : monthKey;

      await setApprovalForUser(row.userId, key, !row.approved);
      setRows((prev) =>
        prev.map((r) => (r.userId === row.userId ? { ...r, approved: !r.approved } : r))
      );
      addNotification(
        row.approved
          ? `Persetujuan ${row.name} dibatalkan`
          : `${row.name} berhasil disetujui`,
        'success'
      );
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    const eligibleNotApproved = rows.filter((r) => r.eligible && !r.approved);
    if (eligibleNotApproved.length === 0) {
      addNotification('Tidak ada guru yang siap disetujui', 'error');
      return;
    }

    setProcessingId('__bulk__');
    try {
      const monthKey = `m-${filterMonth}-${filterYear}`;
      const triwulanKey = `q-${filterTriwulan}-${filterYear}`;
      const key = useTriwulan ? triwulanKey : monthKey;

      for (const r of eligibleNotApproved) {
        await setApprovalForUser(r.userId, key, true);
      }
      setRows((prev) =>
        prev.map((r) =>
          eligibleNotApproved.find((x) => x.userId === r.userId)
            ? { ...r, approved: true }
            : r
        )
      );
      addNotification(
        `Berhasil menyetujui ${eligibleNotApproved.length} guru sekaligus`,
        'success'
      );
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const stats = useMemo(() => {
    return {
      total: rows.length,
      approved: rows.filter((r) => r.approved).length,
      eligibleNotApproved: rows.filter((r) => r.eligible && !r.approved).length,
      notEligible: rows.filter((r) => !r.eligible).length,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Persetujuan Bulanan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setujui jurnal guru yang memenuhi syarat ≥ 80%
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={useTriwulan ? 'q' : 'm'}
              onChange={(e) => setUseTriwulan(e.target.value === 'q')}
              className="text-xs border border-slate-300 rounded-lg px-2 py-2 font-semibold text-slate-700"
            >
              <option value="m">Bulanan</option>
              <option value="q">Triwulan</option>
            </select>
            {useTriwulan ? (
              <select
                value={filterTriwulan}
                onChange={(e) => setFilterTriwulan(parseInt(e.target.value))}
                className="text-xs border border-slate-300 rounded-lg px-2 py-2 font-semibold text-slate-700"
              >
                <option value={1}>T-1 (Jan-Mar)</option>
                <option value={2}>T-2 (Apr-Jun)</option>
                <option value={3}>T-3 (Jul-Sep)</option>
                <option value={4}>T-4 (Okt-Des)</option>
              </select>
            ) : (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="text-xs border border-slate-300 rounded-lg px-2 py-2 font-semibold text-slate-700"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            )}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2 py-2 font-semibold text-slate-700"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Total Guru
          </p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">
            Disetujui
          </p>
          <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-1">
            Siap Disetujui
          </p>
          <p className="text-2xl font-bold text-amber-600">{stats.eligibleNotApproved}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide mb-1">
            Belum Eligible
          </p>
          <p className="text-2xl font-bold text-rose-600">{stats.notEligible}</p>
        </div>
      </div>

      {/* Bulk action */}
      {stats.eligibleNotApproved > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-indigo-900 text-sm">
                {stats.eligibleNotApproved} guru siap disetujui
              </p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Mereka sudah memenuhi syarat ≥ 80%. Setujui sekaligus?
              </p>
            </div>
          </div>
          <button
            onClick={handleBulkApprove}
            disabled={processingId === '__bulk__'}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            {processingId === '__bulk__' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Setujui Semua
          </button>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <p className="font-semibold text-slate-800 text-sm">
            Daftar Persetujuan -{' '}
            {useTriwulan ? `Triwulan ${filterTriwulan}` : months[filterMonth]} {filterYear}
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
            <p className="font-semibold text-slate-700 text-sm">Belum ada guru binaan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    No
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    Nama Guru
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    Jurnal
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    Kelengkapan
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={r.userId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
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
                          <p className="text-[10px] text-slate-500 truncate">NIP {r.nip || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-slate-800">{r.filledCount}</span>
                      <span className="text-slate-400">/{required}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1 min-w-[70px]">
                        <span
                          className={cn(
                            'text-sm font-bold',
                            r.percent >= 80
                              ? 'text-emerald-600'
                              : r.percent >= 40
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          )}
                        >
                          {r.percent}%
                        </span>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              r.percent >= 80
                                ? 'bg-emerald-500'
                                : r.percent >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            )}
                            style={{ width: `${r.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.approved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Disetujui
                        </span>
                      ) : r.eligible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Siap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Belum
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(r)}
                        disabled={
                          processingId === r.userId ||
                          (!r.approved && !r.eligible)
                        }
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                          r.approved
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        )}
                        title={
                          !r.approved && !r.eligible
                            ? 'Belum memenuhi syarat'
                            : r.approved
                            ? 'Batalkan'
                            : 'Setujui'
                        }
                      >
                        {processingId === r.userId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : r.approved ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {r.approved ? 'Batal' : 'Setujui'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}