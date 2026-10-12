import { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, AlertCircle, XCircle,
  Loader2, School, TrendingUp, Award, FileText, Target,
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

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';

const colorMap: Record<ColorKey, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
  purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', fg: 'text-indigo-600' },
};

function StatCard({
  icon, color, label, value, sub,
}: {
  icon: React.ReactNode;
  color: ColorKey;
  label: string;
  value: string | number;
  sub?: string;
}) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2.5 lg:p-3 flex items-center gap-2.5 lg:gap-3">
      <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <span className={c.fg}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight truncate">
          {label}
        </p>
        <p className="text-base lg:text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
        {sub && (
          <p className="text-[9px] lg:text-[10px] text-slate-400 leading-tight truncate">{sub}</p>
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
  profile, teacher, addNotification,
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

  const sekolahGroups: Record<string, SekolahGroup> = {};
  const gurusByNpsn: Record<string, GuruBinaanSummary[]> = {};

  gurus.forEach((g) => {
    const key = g.npsn || 'unknown';
    if (!sekolahGroups[key]) {
      sekolahGroups[key] = {
        npsn: key,
        namaSekolah: g.namaSekolah || g.workUnit || `NPSN ${key}`,
        total: 0, lengkap: 0, kurang: 0, belum: 0,
      };
      gurusByNpsn[key] = [];
    }
    sekolahGroups[key].total += 1;
    const s = getStatus(g.journalCount, required);
    sekolahGroups[key][s] += 1;
    gurusByNpsn[key].push(g);
  });

  const sekolahList = Object.values(sekolahGroups);
  const maxCount = Math.max(1, ...sekolahList.map((s) => s.total));

  const avgPercent = gurus.length > 0
    ? Math.round(gurus.reduce((sum, g) => sum + (required > 0 ? (g.journalCount / required) * 100 : 0), 0) / gurus.length)
    : 0;
  const totalJournals = gurus.reduce((sum, g) => sum + g.journalCount, 0);
  const sekolahTerbaik = [...sekolahList].sort((a, b) => {
    const pctA = a.total > 0 ? (a.lengkap / a.total) * 100 : 0;
    const pctB = b.total > 0 ? (b.lengkap / b.total) * 100 : 0;
    return pctB - pctA;
  })[0];
  const belumIsi = gurus.filter((g) => g.journalCount === 0).length;

  return (
    <div className="flex flex-col gap-2.5 lg:gap-3 lg:h-[calc(100vh-6.75rem)] lg:overflow-hidden">
      {/* OPSI A: 4 kartu atas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3 shrink-0">
        <StatCard icon={<Users className="w-5 h-5" />} color="blue"
          label="Total Binaan" value={loading ? '—' : stats.total}
          sub={`${sekolahList.length} sekolah`} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} color="emerald"
          label="Lengkap" value={loading ? '—' : stats.lengkap} sub="≥80% terisi" />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} color="amber"
          label="Kurang" value={loading ? '—' : stats.kurang} sub="40-79% terisi" />
        <StatCard icon={<XCircle className="w-5 h-5" />} color="rose"
          label="Belum" value={loading ? '—' : stats.belum} sub="<40% terisi" />
      </div>

      {/* OPSI B: Chart per sekolah + mini list */}
      <div className="flex flex-col lg:flex-1 lg:min-h-0 gap-2 lg:gap-2.5">
        <div className="flex items-center gap-2 px-1 shrink-0">
          <School className="w-4 h-4 text-indigo-600" />
          <p className="font-semibold text-slate-800 text-xs lg:text-sm">Kelengkapan per Sekolah</p>
          <span className="ml-auto text-[10px] text-slate-500">
            {format(now, 'MMMM yyyy', { locale: localeId })} · {required} hari kerja
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Memuat data...</p>
            </div>
          </div>
        ) : sekolahList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex items-center justify-center">
            <div className="text-center">
              <School className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Belum ada sekolah binaan</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 lg:gap-3 lg:flex-1 lg:min-h-0 lg:auto-rows-fr">
            {sekolahList.map((s) => {
              const total = s.total || 1;
              const pctLengkap = (s.lengkap / total) * 100;
              const pctKurang = (s.kurang / total) * 100;
              const pctBelum = (s.belum / total) * 100;
              const barScale = (count: number) => Math.max(6, (count / maxCount) * 100);
              const guruList = gurusByNpsn[s.npsn] || [];

              return (
                <div
                  key={s.npsn}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 lg:p-4 flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden"
                >
                  <div className="mb-2 pb-2 lg:mb-3 lg:pb-3 border-b border-slate-100 shrink-0">
                    <p className="font-bold text-slate-800 text-xs lg:text-sm truncate" title={s.namaSekolah}>
                      {s.namaSekolah}
                    </p>
                    <p className="text-[9px] lg:text-[10px] text-slate-500 font-mono mt-0.5">
                      NPSN {s.npsn} · {s.total} binaan
                    </p>
                  </div>

                  {/* Chart vertikal - shrink-0 */}
                  <div className="flex items-end justify-around gap-2 h-20 lg:h-24 mb-2 lg:mb-3 relative shrink-0">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      <div className="border-t border-dashed border-slate-100"></div>
                      <div className="border-t border-dashed border-slate-100"></div>
                      <div className="border-t border-slate-200"></div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                      <span className="text-[10px] lg:text-xs font-bold text-emerald-700 mb-0.5">{s.lengkap}</span>
                      <div className="w-full max-w-[32px] bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md shadow-sm"
                        style={{ height: `${s.lengkap > 0 ? barScale(s.lengkap) : 3}%` }}></div>
                      <p className="text-[8px] lg:text-[9px] font-semibold text-slate-500 mt-1 uppercase tracking-wide">Lengkap</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                      <span className="text-[10px] lg:text-xs font-bold text-amber-700 mb-0.5">{s.kurang}</span>
                      <div className="w-full max-w-[32px] bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md shadow-sm"
                        style={{ height: `${s.kurang > 0 ? barScale(s.kurang) : 3}%` }}></div>
                      <p className="text-[8px] lg:text-[9px] font-semibold text-slate-500 mt-1 uppercase tracking-wide">Kurang</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                      <span className="text-[10px] lg:text-xs font-bold text-rose-700 mb-0.5">{s.belum}</span>
                      <div className="w-full max-w-[32px] bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-md shadow-sm"
                        style={{ height: `${s.belum > 0 ? barScale(s.belum) : 3}%` }}></div>
                      <p className="text-[8px] lg:text-[9px] font-semibold text-slate-500 mt-1 uppercase tracking-wide">Belum</p>
                    </div>
                  </div>

                  {/* Mini list guru - flex-1 dengan scroll internal di lg+ */}
                  <div className="flex-1 lg:min-h-0 mb-2 lg:mb-3 pt-2 lg:pt-3 border-t border-slate-100 flex flex-col">
                    <p className="text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 lg:mb-1.5 shrink-0">
                      Daftar Guru ({guruList.length})
                    </p>
                    <div className="space-y-1 lg:space-y-1.5 lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:pr-1 max-h-40 lg:max-h-none">
                      {guruList.map((g) => {
                        const percent = required > 0 ? Math.round((g.journalCount / required) * 100) : 0;
                        const barColor = percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500';
                        const txtColor = percent >= 80 ? 'text-emerald-700' : percent >= 40 ? 'text-amber-700' : 'text-rose-700';
                        return (
                          <div key={g.userId}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                                {g.profilePhoto ? (
                                  <img src={g.profilePhoto} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-slate-400 font-bold text-[7px] lg:text-[8px]">
                                    {g.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <p className="flex-1 text-[9px] lg:text-[10px] text-slate-700 truncate font-medium">
                                {g.name}
                              </p>
                              <p className={`text-[8px] lg:text-[9px] font-bold shrink-0 ${txtColor}`}>
                                {g.journalCount}/{required} ({percent}%)
                              </p>
                            </div>
                            <div className="w-full h-0.5 lg:h-1 bg-slate-100 rounded-full overflow-hidden" style={{ marginLeft: '22px', width: 'calc(100% - 22px)' }}>
                              <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OPSI C: Ringkasan kabupaten */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-2 px-1">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <p className="font-semibold text-slate-800 text-xs lg:text-sm">Ringkasan Kabupaten</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
          <StatCard icon={<TrendingUp className="w-5 h-5" />} color="indigo"
            label="Rata-rata Kelengkapan" value={loading ? '—' : `${avgPercent}%`}
            sub="Semua binaan" />
          <StatCard icon={<FileText className="w-5 h-5" />} color="purple"
            label="Total Jurnal Bulan Ini" value={loading ? '—' : totalJournals}
            sub={`Dari ${stats.total} binaan`} />
          <StatCard icon={<Target className="w-5 h-5" />}
            color={belumIsi > 0 ? 'rose' : 'emerald'}
            label="Belum Isi Sama Sekali" value={loading ? '—' : belumIsi}
            sub="Perlu ditindaklanjuti" />
          <StatCard icon={<Award className="w-5 h-5" />} color="emerald"
            label="Sekolah Terbaik"
            value={loading ? '—' : sekolahTerbaik?.namaSekolah?.split(' ').slice(0, 2).join(' ') || '—'}
            sub={sekolahTerbaik ? `${sekolahTerbaik.lengkap}/${sekolahTerbaik.total} lengkap` : ''} />
        </div>
      </div>
    </div>
  );
}
