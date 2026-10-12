import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle,
  Loader2, School, TrendingUp, Award,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend,
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

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose';

const colorMap: Record<ColorKey, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
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

  // Stats total
  const stats = {
    total: gurus.length,
    lengkap: gurus.filter((g) => getStatus(g.journalCount, required) === 'lengkap').length,
    kurang: gurus.filter((g) => getStatus(g.journalCount, required) === 'kurang').length,
    belum: gurus.filter((g) => getStatus(g.journalCount, required) === 'belum').length,
  };

  // Group by sekolah (NPSN)
  const sekolahGroups = gurus.reduce((acc, g) => {
    const key = g.npsn || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        npsn: key,
        namaSekolah: g.namaSekolah || g.workUnit || `NPSN ${key}`,
        total: 0,
        lengkap: 0,
        kurang: 0,
        belum: 0,
      };
    }
    acc[key].total += 1;
    const status = getStatus(g.journalCount, required);
    acc[key][status] += 1;
    return acc;
  }, {} as Record<string, { npsn: string; namaSekolah: string; total: number; lengkap: number; kurang: number; belum: number }>);

  const sekolahList = Object.values(sekolahGroups);

  // Top 5 perlu perhatian (belum/kurang, diurut persentase terkecil)
  const perluPerhatian = [...gurus]
    .filter((g) => getStatus(g.journalCount, required) !== 'lengkap')
    .sort((a, b) => {
      const pA = required > 0 ? (a.journalCount / required) * 100 : 0;
      const pB = required > 0 ? (b.journalCount / required) * 100 : 0;
      return pA - pB;
    })
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {/* 4 kartu horizontal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          color="blue"
          label="Total Binaan"
          value={loading ? '—' : stats.total}
          sub={`${sekolahList.length} sekolah`}
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

      {/* Grafik batang per sekolah */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <School className="w-4 h-4 text-indigo-600" />
          <p className="font-semibold text-slate-800 text-sm">Kelengkapan per Sekolah</p>
          <span className="ml-auto text-[10px] text-slate-500">
            {format(now, 'MMMM yyyy', { locale: localeId })} · {required} hari kerja
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
          </div>
        ) : sekolahList.length === 0 ? (
          <div className="py-8 text-center">
            <School className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Belum ada sekolah binaan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sekolahList.map((s) => {
              const total = s.total || 1;
              const pctLengkap = (s.lengkap / total) * 100;
              const pctKurang = (s.kurang / total) * 100;
              const pctBelum = (s.belum / total) * 100;

              return (
                <div key={s.npsn}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {s.namaSekolah}
                    </p>
                    <p className="text-[10px] text-slate-500 shrink-0">
                      {s.total} binaan · NPSN {s.npsn}
                    </p>
                  </div>

                  {/* Stacked bar */}
                  <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-100">
                    {s.lengkap > 0 && (
                      <div
                        className="h-full bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white transition-all"
                        style={{ width: `${pctLengkap}%` }}
                        title={`${s.lengkap} lengkap`}
                      >
                        {pctLengkap >= 15 ? s.lengkap : ''}
                      </div>
                    )}
                    {s.kurang > 0 && (
                      <div
                        className="h-full bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white transition-all"
                        style={{ width: `${pctKurang}%` }}
                        title={`${s.kurang} kurang`}
                      >
                        {pctKurang >= 15 ? s.kurang : ''}
                      </div>
                    )}
                    {s.belum > 0 && (
                      <div
                        className="h-full bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white transition-all"
                        style={{ width: `${pctBelum}%` }}
                        title={`${s.belum} belum`}
                      >
                        {pctBelum >= 15 ? s.belum : ''}
                      </div>
                    )}
                  </div>

                  {/* Legend mini */}
                  <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                    {s.lengkap > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {s.lengkap} Lengkap
                      </span>
                    )}
                    {s.kurang > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {s.kurang} Kurang
                      </span>
                    )}
                    {s.belum > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        {s.belum} Belum
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top 5 Perlu Perhatian */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-600" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Perlu Perhatian</p>
              <p className="text-[11px] text-slate-500">5 teratas yang belum lengkap</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('pw_teachers')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Lihat Semua →
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
          </div>
        ) : perluPerhatian.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">
              {gurus.length === 0 ? 'Belum ada binaan' : 'Semua binaan sudah lengkap! 🎉'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {gurus.length === 0
                ? 'Pastikan user sudah mendaftar dengan NPSN sekolah binaan.'
                : 'Tidak ada yang perlu perhatian bulan ini.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {perluPerhatian.map((g) => {
              const status = getStatus(g.journalCount, required);
              const percent = required > 0 ? Math.round((g.journalCount / required) * 100) : 0;
              const statusColor = {
                lengkap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                kurang: 'bg-amber-50 text-amber-700 border-amber-200',
                belum: 'bg-rose-50 text-rose-700 border-rose-200',
              }[status];

              return (
                <div
                  key={g.userId}
                  className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
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
                      {g.namaSekolah || g.workUnit || '-'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-sm font-bold text-slate-800">{g.journalCount}/{required}</p>
                    <p className="text-[10px] text-slate-500">{percent}%</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusColor}`}>
                    {status === 'lengkap' ? 'Lengkap' : status === 'kurang' ? 'Kurang' : 'Belum'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
