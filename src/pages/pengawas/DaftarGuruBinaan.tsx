import { useEffect, useMemo, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle, RefreshCw, Loader2,
  Search, ChevronDown, ChevronRight, Eye,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend,
  getMonth, getYear,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getGuruBinaan, type GuruBinaanSummary } from '../../lib/db';
import type { UserProfile, TabKey } from '../../types';
import { isHoliday } from '../../lib/holidays';
import { cn } from '../../lib/utils';

interface DaftarGuruBinaanProps {
  profile: UserProfile;
  onNavigate: (tab: TabKey) => void;
  addNotification: (message: string, type: 'success' | 'error') => void;
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
}: DaftarGuruBinaanProps) {
  const [gurus, setGurus] = useState<GuruBinaanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | StatusType>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('status');

  // Filter bulan/tahun
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(getMonth(now));
  const [filterYear, setFilterYear] = useState<number>(getYear(now));

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Hitung hari kerja bulan terpilih
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
      const data = await getGuruBinaan(profile.npsnBinaList || []);
      setGurus(data);
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

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...gurus];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.nip.toLowerCase().includes(q)
      );
    }

    if (filter !== 'all') {
      list = list.filter((g) => getStatus(g.journalCount, required) === filter);
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
  }, [gurus, search, filter, sortBy, required]);

  const stats = useMemo(() => {
    return {
      total: gurus.length,
      lengkap: gurus.filter((g) => getStatus(g.journalCount, required) === 'lengkap').length,
      kurang: gurus.filter((g) => getStatus(g.journalCount, required) === 'kurang').length,
      belum: gurus.filter((g) => getStatus(g.journalCount, required) === 'belum').length,
    };
  }, [gurus, required]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Daftar Guru Binaan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit Kerja: <span className="font-semibold">{profile.workUnitBina || '-'}</span>
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors text-sm font-semibold text-slate-700 disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Segarkan
          </button>
        </div>
      </div>

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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NIP guru..."
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
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : gurus.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Belum ada guru binaan</p>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              Pastikan guru-guru sudah mendaftar dan mengisi <strong>Unit Kerja</strong> di
              Profil dengan tepat: "{profile.workUnitBina}"
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Tidak ada guru yang cocok</p>
            <p className="text-xs text-slate-500 mt-1">Coba ubah filter atau kata kunci</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    No
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Nama Guru
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    NIP
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Jabatan
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Jurnal {months[filterMonth].slice(0, 3)}
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g, idx) => {
                  const status = getStatus(g.journalCount, required);
                  const cfg = statusConfig[status];
                  const Icon = cfg.icon;
                  const percent = required > 0 ? Math.round((g.journalCount / required) * 100) : 0;

                  return (
                    <tr key={g.userId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                            {g.profilePhoto ? (
                              <img src={g.profilePhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-slate-400 font-bold text-xs">
                                {g.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{g.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{g.subject || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {g.nip || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {g.position || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1 min-w-[90px]">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-slate-800">{g.journalCount}</span>
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
                      <td className="px-4 py-3 text-center">
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
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            addNotification(`Detail verifikasi ${g.name} - segera hadir`, 'success');
                            onNavigate('pw_approve');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                          title="Verifikasi Jurnal"
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