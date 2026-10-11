import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle, TrendingUp,
  RefreshCw, Loader2, ArrowRight,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getMonth, getYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getGuruBinaan, type GuruBinaanSummary } from '../../lib/db';
import type { UserProfile, TabKey, TeacherData } from '../../types';
import { isHoliday } from '../../lib/holidays';
import { cn } from '../../lib/utils';

interface DashboardPengawasProps {
  profile: UserProfile;
  teacher: TeacherData;
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

const statusConfig: Record<StatusType, { label: string; color: string; icon: any }> = {
  lengkap: { label: 'Lengkap', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  kurang: { label: 'Kurang', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertCircle },
  belum: { label: 'Belum', color: 'text-rose-700 bg-rose-50 border-rose-200', icon: XCircle },
};

export function DashboardPengawas({
  profile,
  teacher,
  onNavigate,
  addNotification,
}: DashboardPengawasProps) {
  const [gurus, setGurus] = useState<GuruBinaanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthIdx = getMonth(now);
  const yearNow = getYear(now);

  // Hitung hari kerja bulan ini
  const workDaysThisMonth = eachDayOfInterval({
    start: startOfMonth(now),
    end: endOfMonth(now),
  }).filter((d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd')));

  const required = workDaysThisMonth.length;

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getGuruBinaan(profile.workUnitBina || '');
      setGurus(data);
    } catch (e) {
      console.error(e);
      addNotification('Gagal memuat data guru binaan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.workUnitBina]);

  // Statistik
  const stats = {
    total: gurus.length,
    lengkap: gurus.filter((g) => getStatus(g.journalCount, required) === 'lengkap').length,
    kurang: gurus.filter((g) => getStatus(g.journalCount, required) === 'kurang').length,
    belum: gurus.filter((g) => getStatus(g.journalCount, required) === 'belum').length,
  };

  // Sort: yang belum dulu, supaya perhatian pengawas
  const sortedGurus = [...gurus].sort((a, b) => {
    const sA = getStatus(a.journalCount, required);
    const sB = getStatus(b.journalCount, required);
    const order: Record<StatusType, number> = { belum: 0, kurang: 1, lengkap: 2 };
    return order[sA] - order[sB];
  });

  return (
    <div className="space-y-4">

      {/* 4 kartu statistik */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Total Guru
          </p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Guru binaan</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Lengkap
          </p>
          <p className="text-2xl font-bold text-emerald-600">{stats.lengkap}</p>
          <p className="text-[11px] text-slate-500 mt-1">≥80% terisi</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Kurang
          </p>
          <p className="text-2xl font-bold text-amber-600">{stats.kurang}</p>
          <p className="text-[11px] text-slate-500 mt-1">40–79% terisi</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Belum
          </p>
          <p className="text-2xl font-bold text-rose-600">{stats.belum}</p>
          <p className="text-[11px] text-slate-500 mt-1">&lt;40% terisi</p>
        </div>
      </div>

      {/* Progress global kelengkapan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <p className="font-semibold text-slate-800 text-sm">Kelengkapan Guru Binaan</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-emerald-50 rounded-lg">
            <p className="text-lg font-bold text-emerald-700">{stats.lengkap}</p>
            <p className="text-[10px] text-emerald-600 font-medium">Lengkap</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <p className="text-lg font-bold text-amber-700">{stats.kurang}</p>
            <p className="text-[10px] text-amber-600 font-medium">Kurang</p>
          </div>
          <div className="text-center p-2 bg-rose-50 rounded-lg">
            <p className="text-lg font-bold text-rose-700">{stats.belum}</p>
            <p className="text-[10px] text-rose-600 font-medium">Belum</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 text-center">
          Bulan {format(now, 'MMMM yyyy', { locale: localeId })} · {required} hari kerja
        </p>
      </div>

      {/* Daftar guru ringkas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Daftar Guru Binaan</p>
            <p className="text-[11px] text-slate-500">
              Diurutkan berdasarkan prioritas verifikasi
            </p>
          </div>
          <button
            onClick={() => onNavigate('pw_teachers')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            Lihat Semua
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : gurus.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Belum ada guru binaan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Pastikan guru-guru sudah mendaftar dengan <strong>Unit Kerja</strong> yang sama
              persis dengan <strong>Unit Kerja Binaan</strong> Anda: "{profile.workUnitBina}"
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedGurus.slice(0, 5).map((g) => {
              const status = getStatus(g.journalCount, required);
              const cfg = statusConfig[status];
              const Icon = cfg.icon;
              const percent = required > 0 ? Math.round((g.journalCount / required) * 100) : 0;

              return (
                <div key={g.userId} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                    {g.profilePhoto ? (
                      <img src={g.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 font-bold text-sm">
                        {g.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{g.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      NIP {g.nip || '-'} · {g.journalCount}/{required} hari ({percent}%)
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0',
                      cfg.color
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
            {sortedGurus.length > 5 && (
              <div className="p-3 text-center bg-slate-50">
                <button
                  onClick={() => onNavigate('pw_teachers')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  +{sortedGurus.length - 5} guru lainnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}