import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle,
  Loader2, School,
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

interface SekolahGroup {
  npsn: string;
  namaSekolah: string;
  total: number;
  lengkap: number;
  kurang: number;
  belum: number;
}

export function DashboardPengawas({
  profile,
  teacher,
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

  const stats = {
    total: gurus.length,
    lengkap: gurus.filter((g) => getStatus(g.journalCount, required) === 'lengkap').length,
    kurang: gurus.filter((g) => getStatus(g.journalCount, required) === 'kurang').length,
    belum: gurus.filter((g) => getStatus(g.journalCount, required) === 'belum').length,
  };

  // Group per sekolah
  const sekolahGroups: Record<string, SekolahGroup> = {};
  gurus.forEach((g) => {
    const key = g.npsn || 'unknown';
    if (!sekolahGroups[key]) {
      sekolahGroups[key] = {
        npsn: key,
        namaSekolah: g.namaSekolah || g.workUnit || `NPSN ${key}`,
        total: 0,
        lengkap: 0,
        kurang: 0,
        belum: 0,
      };
    }
    sekolahGroups[key].total += 1;
    const s = getStatus(g.journalCount, required);
    sekolahGroups[key][s] += 1;
  });

  const sekolahList = Object.values(sekolahGroups);
  const maxCount = Math.max(1, ...sekolahList.map((s) => s.total));

  return (
    <div className="space-y-3">
      {/* 4 kartu info */}
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

      {/* Kelengkapan per Sekolah - grid 3 kolom */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <School className="w-4 h-4 text-indigo-600" />
          <p className="font-semibold text-slate-800 text-sm">Kelengkapan per Sekolah</p>
          <span className="ml-auto text-[10px] text-slate-500">
            {format(now, 'MMMM yyyy', { locale: localeId })} · {required} hari kerja
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : sekolahList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <School className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Belum ada sekolah binaan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sekolahList.map((s) => {
              const total = s.total || 1;
              const pctLengkap = (s.lengkap / total) * 100;
              const pctKurang = (s.kurang / total) * 100;
              const pctBelum = (s.belum / total) * 100;

              // Tinggi bar: proporsional terhadap sekolah dengan guru terbanyak
              const barScale = (count: number) => Math.max(8, (count / maxCount) * 100);

              return (
                <div
                  key={s.npsn}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col"
                >
                  {/* Header sekolah */}
                  <div className="mb-3 pb-3 border-b border-slate-100">
                    <p className="font-bold text-slate-800 text-sm truncate" title={s.namaSekolah}>
                      {s.namaSekolah}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      NPSN {s.npsn} · {s.total} binaan
                    </p>
                  </div>

                  {/* Bar chart vertikal */}
                  <div className="flex items-end justify-around gap-2 h-32 mb-3 relative">
                    {/* Gridlines background */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      <div className="border-t border-dashed border-slate-100"></div>
                      <div className="border-t border-dashed border-slate-100"></div>
                      <div className="border-t border-dashed border-slate-100"></div>
                      <div className="border-t border-slate-200"></div>
                    </div>

                    {/* Bar Lengkap */}
                    <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                      <span className="text-xs font-bold text-emerald-700 mb-1">
                        {s.lengkap}
                      </span>
                      <div
                        className="w-full max-w-[40px] bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md shadow-sm transition-all"
                        style={{ height: `${s.lengkap > 0 ? barScale(s.lengkap) : 4}%` }}
                      ></div>
                      <p className="text-[9px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">
                        Lengkap
                      </p>
                    </div>

                    {/* Bar Kurang */}
                    <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                      <span className="text-xs font-bold text-amber-700 mb-1">
                        {s.kurang}
                      </span>
                      <div
                        className="w-full max-w-[40px] bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md shadow-sm transition-all"
                        style={{ height: `${s.kurang > 0 ? barScale(s.kurang) : 4}%` }}
                      ></div>
                      <p className="text-[9px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">
                        Kurang
                      </p>
                    </div>

                    {/* Bar Belum */}
                    <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                      <span className="text-xs font-bold text-rose-700 mb-1">
                        {s.belum}
                      </span>
                      <div
                        className="w-full max-w-[40px] bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-md shadow-sm transition-all"
                        style={{ height: `${s.belum > 0 ? barScale(s.belum) : 4}%` }}
                      ></div>
                      <p className="text-[9px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wide">
                        Belum
                      </p>
                    </div>
                  </div>

                  {/* Stacked bar mini */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-100">
                    {s.lengkap > 0 && (
                      <div className="h-full bg-emerald-500" style={{ width: `${pctLengkap}%` }} />
                    )}
                    {s.kurang > 0 && (
                      <div className="h-full bg-amber-500" style={{ width: `${pctKurang}%` }} />
                    )}
                    {s.belum > 0 && (
                      <div className="h-full bg-rose-500" style={{ width: `${pctBelum}%` }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
