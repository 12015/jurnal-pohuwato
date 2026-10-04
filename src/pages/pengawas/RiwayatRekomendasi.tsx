import { useEffect, useMemo, useState } from 'react';
import {
  FileCheck, Loader2, RefreshCw, CheckCircle2, Calendar, FileText,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getRekomendasiHistory, type RekomendasiHistory } from '../../lib/db';
import type { UserProfile } from '../../types';
import { cn } from '../../lib/utils';

interface RiwayatRekomendasiProps {
  profile: UserProfile;
  addNotification: (message: string, type: 'success' | 'error') => void;
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function parsePeriodKey(key: string): { label: string; type: 'bulan' | 'triwulan' } {
  const parts = key.split('-');
  if (parts[0] === 'm') {
    const m = parseInt(parts[1]);
    const y = parts[2];
    return { label: `Bulan ${months[m] || '-'} ${y}`, type: 'bulan' };
  }
  if (parts[0] === 'q') {
    const q = parseInt(parts[1]);
    const y = parts[2];
    return { label: `Triwulan ${q} ${y}`, type: 'triwulan' };
  }
  return { label: key, type: 'bulan' };
}

export function RiwayatRekomendasi({ profile, addNotification }: RiwayatRekomendasiProps) {
  const [history, setHistory] = useState<RekomendasiHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGuru, setFilterGuru] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRekomendasiHistory(profile.workUnitBina || '');
      setHistory(data);
    } catch (e) {
      console.error(e);
      addNotification('Gagal memuat riwayat', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.workUnitBina]);

  const filtered = useMemo(() => {
    if (!filterGuru.trim()) return history;
    const q = filterGuru.toLowerCase();
    return history.filter(
      (h) =>
        h.guruName.toLowerCase().includes(q) ||
        h.guruNip.toLowerCase().includes(q)
    );
  }, [history, filterGuru]);

  // Grup per guru
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; nip: string; items: RekomendasiHistory[] }>();
    filtered.forEach((h) => {
      const curr = map.get(h.guruUserId) || {
        name: h.guruName,
        nip: h.guruNip,
        items: [],
      };
      curr.items.push(h);
      map.set(h.guruUserId, curr);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const stats = useMemo(() => {
    const gurus = new Set(history.map((h) => h.guruUserId));
    return {
      totalRekomendasi: history.length,
      totalGuru: gurus.size,
    };
  }, [history]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Riwayat Rekomendasi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.totalRekomendasi} rekomendasi dari {stats.totalGuru} guru binaan
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

      {/* Pencarian */}
      {!loading && history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <input
            type="text"
            placeholder="Cari nama guru atau NIP..."
            value={filterGuru}
            onChange={(e) => setFilterGuru(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Memuat riwayat...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Belum ada riwayat rekomendasi</p>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            Riwayat akan muncul setelah Anda menyetujui jurnal guru binaan di menu
            <strong> Persetujuan</strong>.
          </p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="font-semibold text-slate-700">Tidak ada hasil</p>
          <p className="text-xs text-slate-500 mt-1">Coba kata kunci lain</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <div
              key={g.name}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Header guru */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-indigo-700 font-bold text-sm">
                    {g.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{g.name}</p>
                  <p className="text-[11px] text-slate-500">
                    NIP {g.nip || '-'} · {g.items.length} rekomendasi
                  </p>
                </div>
              </div>

              {/* Daftar rekomendasi */}
              <div className="divide-y divide-slate-100">
                {g.items.map((h) => {
                  const { label, type } = parsePeriodKey(h.periodKey);
                  return (
                    <div key={`${h.guruUserId}-${h.periodKey}`} className="p-4 flex items-center gap-3">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          type === 'triwulan'
                            ? 'bg-purple-50 text-purple-600'
                            : 'bg-blue-50 text-blue-600'
                        )}
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800">{label}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Disetujui{' '}
                          {h.updatedAt
                            ? format(parseISO(h.updatedAt), 'd MMM yyyy, HH:mm', {
                                locale: localeId,
                              })
                            : '-'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <FileText className="w-3 h-3" />
                        Rekomendasi
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}