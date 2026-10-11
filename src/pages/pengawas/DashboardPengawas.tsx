import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle, TrendingUp,
  Loader2, ArrowRight,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getMonth, getYear,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getGuruBinaan, type GuruBinaanSummary } from '../../lib/db';
import type { UserProfile, TabKey, TeacherData } from '../../types';
import { isHoliday } from '../../lib/holidays';

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

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';

const colorMap: Record<ColorKey, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
  slate: { bg: 'bg-slate-100', fg: 'text-slate-500' },
  purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
};

function StatCard({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  color: ColorKey;
  label: string;
  value: string | number;
  sub?: string;
}) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <span className={c.fg}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight truncate">
          {label}
        </p>
        <p className="text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
        {sub && (
          <p className="text-[10px] text-slate-400 leading-tight truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

export function DashboardPengawas({
  profile,
  teacher,
  onNavigate,
  addNotification,
}: DashboardPengawasProps) {
  void teacher;
  const [gurus, setGurus] = useState<GuruBinaanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthIdx = getMonth(now);
  const yearNow = getYear(now);

  const workDaysThisMonth = eachDayOfInterval({
    start: startOfMonth(now),
    end: endOfMonth(now),
  }).filter((d) => !isWeekend(d) && !isHoliday(format(d, 'yyyy-MM-dd')));

  const required = workDaysThisMonth.length;

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getGuruBinaan(profile.npsnBinaList || []);
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
  }, [profile.npsnBinaList]);

  const stats = {
    total: gurus.length,
    lengkap: gurus.filter((g) => getStatus(g.journalCount, required) === 'lengkap').length,
    kurang: gurus.filter((g) => getStatus(g.journalCount, required) === 'kurang').length,
    belum: gurus.filter((g) => getStatus(g.journalCount, required) === 'belum').length,
  };

  const sortedGurus = [...gurus].sort((a, b) => {
    const sA = getStatus(a.journalCount, required);
    const sB = getStatus(b.journalCount, required);
    const order: Record<StatusType, number> = { belum: 0, kurang: 1, lengkap: 2 };
    return order[sA] - order[sB] || a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-3">
      {/* 4 kartu horizontal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          color="blue"
          label="Total Binaan"
          value={loading ? '—' : stats.total}
          sub="Guru & kepsek"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          label="Lengkap"
          value={loading ? '—' : stats.lengkap}
          sub="≥80% terisi"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5" />}
          color="amber"
          label="Kurang"
          value={loading ? '—' : stats.kurang}
          sub="40-79% terisi"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          color="rose"
          label="Belum"
          value={loading ? '—' : stats.belum}
          sub="<40% terisi"
        />
      </div>

      {/* Progress ringkas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <p className="font-semibold text-slate-800 text-sm">Kelengkapan Guru Binaan</p>
          <span className="ml-auto text-[11px] text-slate-500">
            {format(now, 'MMMM yyyy', { locale: localeId })} · {required} hari kerja
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
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
      </div>

      {/* Daftar ringkas 5 teratas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Daftar Binaan</p>
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
            <p className="font-semibold text-slate-700 text-sm">Belum ada binaan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Pastikan user sudah mendaftar dengan NPSN sekolah yang menjadi binaan Anda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedGurus.slice(0, 5).map((g) => {
              const status = getStatus(g.journalCount, required);
              const statusCfg = {
                lengkap: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Lengkap', Icon: CheckCircle2 },
                kurang: { color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Kurang', Icon: AlertCircle },
                belum: { color: 'text-rose-700 bg-rose-50 border-rose-200', label: 'Belum', Icon: XCircle },
              }[status];
              const SIcon = statusCfg.Icon;
              const percent = required > 0 ? Math.round((g.journalCount / required) * 100) : 0;
              return (
                <div key={g.userId} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                    {g.profilePhoto ? (
                      <img src={g.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 font-bold text-xs">
                        {g.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{g.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {g.namaSekolah || g.workUnit || '-'} · {g.journalCount}/{required} hari ({percent}%)
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusCfg.color}`}
                  >
                    <SIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                </div>
              );
            })}
            {sortedGurus.length > 5 && (
              <div className="p-2.5 text-center bg-slate-50">
                <button
                  onClick={() => onNavigate('pw_teachers')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  +{sortedGurus.length - 5} binaan lainnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
