import { useEffect, useMemo, useState } from 'react';
import {
  Users, RefreshCw, Loader2, Search, UserCheck,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend,
} from 'date-fns';
import { getAllBinaan, type BinaanSummary } from '../../lib/db';
import type { UserProfile, TabKey } from '../../types';
import { isHoliday } from '../../lib/holidays';

interface DaftarGuruBinaanProps {
  profile: UserProfile;
  onNavigate: (tab: TabKey) => void;
  addNotification: (message: string, type: 'success' | 'error') => void;
  title?: string;
}

export function DaftarGuruBinaan({
  profile,
  addNotification,
}: DaftarGuruBinaanProps) {
  const [rows, setRows] = useState<BinaanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const now = new Date();

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

    // Khusus kepsek: sembunyikan kepsek (diri sendiri) — hanya tampil guru
    if (profile.role === 'kepala_sekolah') {
      list = list.filter((r) => r.role !== 'kepala_sekolah');
    }

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
  }, [rows, search, profile.role]);

  // Split ke 2 kolom
  const half = Math.ceil(filtered.length / 2);
  const leftCol = filtered.slice(0, half);
  const rightCol = filtered.slice(half);

  const renderCol = (list: BinaanSummary[], keyPrefix: string) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-3 py-2.5 font-bold text-slate-700 text-[10px] uppercase tracking-wider">Nama</th>
            <th className="text-left px-3 py-2.5 font-bold text-slate-700 text-[10px] uppercase tracking-wider">Sekolah</th>
            <th className="text-center px-3 py-2.5 font-bold text-slate-700 text-[10px] uppercase tracking-wider">Jabatan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((r) => (
            <tr key={`${keyPrefix}-${r.userId}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                    {r.profilePhoto ? (
                      <img src={r.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 font-bold text-[10px]">
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-xs truncate">{r.name}</p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">
                      NIP {r.nip || '-'}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <p className="font-medium text-slate-700 text-xs truncate max-w-[160px]">
                  {r.namaSekolah || r.workUnit || '-'}
                </p>
                {r.npsn && (
                  <p className="text-[9px] text-slate-400 font-mono">NPSN {r.npsn}</p>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                {r.role === 'kepala_sekolah' ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <UserCheck className="w-2.5 h-2.5" /> Kepsek
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Guru
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );

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

      {/* 2 Kolom Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Memuat data...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Belum ada binaan</p>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            Pastikan user sudah mendaftar dengan NPSN sekolah yang menjadi binaan Anda.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Tidak ada yang cocok</p>
          <p className="text-xs text-slate-500 mt-1">Coba ubah kata kunci</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {renderCol(leftCol, 'left')}
          {rightCol.length > 0 && renderCol(rightCol, 'right')}
        </div>
      )}
    </div>
  );
}
