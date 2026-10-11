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

const statusConfig: Record<StatusType, { label: string; color: string; icon: any }> = {
  lengkap: {
    label: 'Lengkap',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  kurang: {
    label: 'Kurang',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: AlertCircle,
  },
  belum: {
    label: 'Belum',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    icon: XCircle,
  },
};

export function DaftarGuruBinaan({
  profile,
  onNavigate,
  addNotification,
}: DaftarGuruBinaanProps) {
  const [rows, setRows] = useState<BinaanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const now = new Date();
  const required = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return eachDayOfInterval({ start, end }).filter(
      (d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd'))
    ).length;
  }, []);

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
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [rows, search]);

  return (
    <div className="space-y-3">
      {/* Search + Refresh */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
        <div className="flex gap-2">
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

      {/* Tabel 3 kolom */}
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
            <p className="text-xs text-slate-500 mt-1">Coba ubah kata kunci</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Nama</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Sekolah</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Jabatan</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.userId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
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
                            NIP {r.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-slate-700 truncate max-w-[260px]">
                        {r.namaSekolah || r.workUnit || '-'}
                      </p>
                      {r.npsn && (
                        <p className="text-[10px] text-slate-400 font-mono">NPSN {r.npsn}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.role === 'kepala_sekolah' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <UserCheck className="w-3 h-3" /> Kepala Sekolah
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Guru
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
