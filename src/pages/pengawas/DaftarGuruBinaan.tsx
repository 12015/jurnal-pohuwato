import { useEffect, useMemo, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle, RefreshCw, Loader2,
  Search, Eye, UserCheck,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend,
  getMonth, getYear,
} from 'date-fns';
import { getAllBinaan, type BinaanSummary } from '../../lib/db';
import type { UserProfile, TabKey } from '../../types';
import { isHoliday } from '../../lib/holidays';
import { cn } from '../../lib/utils';

interface DaftarGuruBinaanProps {
  profile: UserProfile;
  onNavigate: (tab: TabKey) => void;
  addNotification: (message: string, type: 'success' | 'error') => void;
  title?: string;
}

type StatusType = 'lengkap' | 'kurang' | 'belum';

function getStatus(count: number, required: number): StatusType {
  if (required === 0) return 'belum';
  const percent = (count / required) * 100;
  if (percent >= 80) return 'lengkap';
  if (percent >= 40) return 'kurang';
  return 'belum';
}

const statusConfig: Record<StatusType, { label: string; color: string; barColor: string; icon: any }> = {
  lengkap: {
    label: 'Lengkap',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    barColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  kurang: {
    label: 'Kurang',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    barColor: 'bg-amber-500',
    icon: AlertCircle,
  },
  belum: {
    label: 'Belum',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    barColor: 'bg-rose-500',
    icon: XCircle,
  },
};

export function DaftarGuruBinaan({
  profile,
  onNavigate,
  addNotification,
  title = 'Daftar Guru',
}: DaftarGuruBinaanProps) {
  const [rows, setRows] = useState<BinaanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | StatusType>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('status');

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(getMonth(now));
  const [filterYear, setFilterYear] = useState<number>(getYear(now));

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const required = useMemo(() => {
    const start = startOfMonth(new Date(filterYear, filterMonth));
    const end = endOfMonth(new Date(filterYear, filterMonth));
    return eachDayOfInterval({ start, end }).filter(
      (d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd'))
    ).length;
  }, [filterMonth, filterYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const npsnList = profile.npsnBinaList || (profile.npsnBina ? [profile.npsnBina] : []);
      const data = await getAllBinaan(npsnList);
      setRows(data);
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
  }, [profile.npsnBinaList, profile.npsnBina]);

  const filtered = useMemo(() => {
    let list = [...rows];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.nip.toLowerCase().includes(q) ||
          (r.namaSekolah || r.workUnit || '').toLowerCase().includes(q)
      );
    }

    if (filter !== 'all') {
      list = list.filter((r) => getStatus(r.journalCount, required) === filter);
    }

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const order: Record<StatusType, number> = { belum: 0, kurang: 1, lengkap: 2 };
      list.sort((a, b) => {
        const sA = getStatus(a.journalCount, required);
        const sB = getStatus(b.journalCount, required);
        return order[sA] - order[sB] || a.name.localeCompare(b.name);
      });
    }

    return list;
  }, [rows, search, filter, sortBy, required]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      lengkap: rows.filter((r) => getStatus(r.journalCount, required) === 'lengkap').length,
      kurang: rows.filter((r) => getStatus(r.journalCount, required) === 'kurang').length,
      belum: rows.filter((r) => getStatus(r.journalCount, required) === 'belum').length,
    };
  }, [rows, required]);

  return (
    <div className="space-y-3">
      {/* Statistik ringkas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'all' ? 'border-indigo-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilter('lengkap')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'lengkap' ? 'border-emerald-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Lengkap</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.lengkap}</p>
        </button>
        <button
          onClick={() => setFilter('kurang')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'kurang' ? 'border-amber-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Kurang</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.kurang}</p>
        </button>
        <button
          onClick={() => setFilter('belum')}
          className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-3 text-left transition-all hover:shadow-md',
            filter === 'belum' ? 'border-rose-500' : 'border-slate-200'
          )}
        >
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide">Belum</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.belum}</p>
        </button>
      </div>

      {/* Filter bulan + pencarian */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIP, atau sekolah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'status')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="status">Urut: Status</option>
            <option value="name">Urut: Nama</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-semibold text-slate-700 disabled:opacity-50 shrink-0"
            title="Segarkan"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Belum ada binaan</p>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              Pastikan user sudah mendaftar dengan NPSN sekolah yang menjadi binaan Anda.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Tidak ada yang cocok</p>
            <p className="text-xs text-slate-500 mt-1">Coba ubah filter atau kata kunci</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">No</th>
                  <th className="text-left px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Nama</th>
                  <th className="text-left px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">NIP</th>
                  <th className="text-left px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Jabatan</th>
                  <th className="text-left px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Sekolah</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Jurnal {months[filterMonth].slice(0, 3)}
                  </th>
                  <th className="text-center px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, idx) => {
                  const status = getStatus(r.journalCount, required);
                  const cfg = statusConfig[status];
                  const Icon = cfg.icon;
                  const percent = required > 0 ? Math.round((r.journalCount / required) * 100) : 0;

                  return (
                    <tr key={r.userId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-500 font-medium">{idx + 1}</td>
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
                            <p className="text-[10px] text-slate-500 truncate">{r.subject || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-mono text-xs">{r.nip || '-'}</td>
                      <td className="px-3 py-3">
                        {r.role === 'kepala_sekolah' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <UserCheck className="w-3 h-3" /> Kepsek
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Guru
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700 text-xs">
                        <p className="font-medium truncate max-w-[200px]">
                          {r.namaSekolah || r.workUnit || '-'}
                        </p>
                        {r.npsn && (
                          <p className="text-[10px] text-slate-400 font-mono">NPSN {r.npsn}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-center gap-1 min-w-[80px]">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-slate-800">{r.journalCount}</span>
                            <span className="text-[10px] text-slate-400">/ {required}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full transition-all', cfg.barColor)}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border',
                            cfg.color
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => {
                            addNotification(`Membuka verifikasi ${r.name}...`, 'success');
                            onNavigate('pw_approve');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                          title="Verifikasi Rekomendasi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Verifikasi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
