import { useEffect, useMemo, useState } from 'react';
import {
  Users, Loader2, ChevronLeft, CheckCircle2, XCircle, AlertCircle,
  Calendar, FileText, CheckSquare, Square,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isWeekend, getMonth, getYear,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  getGuruBinaan, getJournalsByUser, getApprovalsByUser, setApprovalForUser,
  type GuruBinaanSummary,
} from '../../lib/db';
import type { UserProfile, JournalEntry } from '../../types';
import { HOLIDAYS_2026 } from '../../types';
import { cn } from '../../lib/utils';

interface VerifikasiJurnalProps {
  profile: UserProfile;
  addNotification: (message: string, type: 'success' | 'error') => void;
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function VerifikasiJurnal({ profile, addNotification }: VerifikasiJurnalProps) {
  const now = new Date();
  const [gurus, setGurus] = useState<GuruBinaanSummary[]>([]);
  const [loadingGurus, setLoadingGurus] = useState(true);
  const [selectedGuru, setSelectedGuru] = useState<GuruBinaanSummary | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [approvals, setApprovals] = useState<string[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isTogglingApproval, setIsTogglingApproval] = useState(false);

  const [filterMonth, setFilterMonth] = useState<number>(getMonth(now));
  const [filterYear, setFilterYear] = useState<number>(getYear(now));
  const [useTriwulan, setUseTriwulan] = useState(false);
  const [filterTriwulan, setFilterTriwulan] = useState<number>(
    Math.floor(getMonth(now) / 3) + 1
  );

  // Load daftar guru binaan
  useEffect(() => {
    (async () => {
      setLoadingGurus(true);
      try {
        const data = await getGuruBinaan(profile.workUnitBina || '');
        setGurus(data);
      } finally {
        setLoadingGurus(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.workUnitBina]);

  // Load detail saat guru / bulan berubah
  useEffect(() => {
    if (!selectedGuru) return;
    (async () => {
      setLoadingDetail(true);
      try {
        const [j, a] = await Promise.all([
          getJournalsByUser(selectedGuru.userId, filterMonth, filterYear),
          getApprovalsByUser(selectedGuru.userId),
        ]);
        setJournals(j);
        setApprovals(a);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [selectedGuru, filterMonth, filterYear]);

  // Hari kerja bulan ini
  const workDays = useMemo(() => {
    const start = startOfMonth(new Date(filterYear, filterMonth));
    const end = endOfMonth(new Date(filterYear, filterMonth));
    return eachDayOfInterval({ start, end }).filter(
      (d) => !isWeekend(d) && !HOLIDAYS_2026.includes(format(d, 'yyyy-MM-dd'))
    );
  }, [filterMonth, filterYear]);

  const required = workDays.length;
  const filled = journals.length;
  const percent = required > 0 ? Math.round((filled / required) * 100) : 0;
  const eligible = percent >= 80;

  // Period key
  const monthKey = `m-${filterMonth}-${filterYear}`;
  const triwulanKey = `q-${filterTriwulan}-${filterYear}`;
  const isApproved = useTriwulan
    ? approvals.includes(triwulanKey)
    : approvals.includes(monthKey);

  const handleToggleApproval = async () => {
    if (!selectedGuru) return;
    if (!eligible) {
      addNotification('Guru belum memenuhi syarat kelengkapan 80%', 'error');
      return;
    }
    setIsTogglingApproval(true);
    try {
      const key = useTriwulan ? triwulanKey : monthKey;
      await setApprovalForUser(selectedGuru.userId, key, !isApproved);
      setApprovals((prev) =>
        isApproved ? prev.filter((k) => k !== key) : [...prev, key]
      );
      addNotification(
        isApproved ? 'Persetujuan dibatalkan' : 'Berhasil disetujui!',
        'success'
      );
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setIsTogglingApproval(false);
    }
  };

  // ==== VIEW: pilih guru ====
  if (!selectedGuru) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Pilih Guru untuk Diverifikasi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih guru dari daftar binaan untuk memeriksa jurnalnya
          </p>
        </div>

        {loadingGurus ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat daftar guru...</p>
          </div>
        ) : gurus.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Belum ada guru binaan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gurus.map((g) => (
              <button
                key={g.userId}
                onClick={() => setSelectedGuru(g)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-left hover:border-indigo-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                    {g.profilePhoto ? (
                      <img src={g.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 font-bold text-sm">
                        {g.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-800 truncate">{g.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {g.subject || '-'} · {g.position || '-'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==== VIEW: detail guru terpilih ====
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedGuru(null);
                setJournals([]);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Kembali"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <p className="font-bold text-slate-800 text-sm">{selectedGuru.name}</p>
              <p className="text-[11px] text-slate-500">
                NIP {selectedGuru.nip || '-'} · {selectedGuru.subject || '-'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={useTriwulan ? 'q' : 'm'}
              onChange={(e) => setUseTriwulan(e.target.value === 'q')}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
            >
              <option value="m">Bulanan</option>
              <option value="q">Triwulan</option>
            </select>
            {useTriwulan ? (
              <select
                value={filterTriwulan}
                onChange={(e) => setFilterTriwulan(parseInt(e.target.value))}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
              >
                <option value={1}>T-1 (Jan-Mar)</option>
                <option value={2}>T-2 (Apr-Jun)</option>
                <option value={3}>T-3 (Jul-Sep)</option>
                <option value={4}>T-4 (Okt-Des)</option>
              </select>
            ) : (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            )}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-semibold text-slate-700"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistik */}
      {loadingDetail ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Memuat jurnal...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Jurnal Terisi
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {filled}<span className="text-sm text-slate-400">/{required}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Hari kerja</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Kelengkapan
              </p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  eligible ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {percent}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {eligible ? '≥ 80% ✓' : 'Target 80%'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Status
              </p>
              <p
                className={cn(
                  'text-base font-bold flex items-center gap-1.5',
                  isApproved ? 'text-emerald-600' : 'text-slate-600'
                )}
              >
                {isApproved ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> Disetujui
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" /> Belum
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {useTriwulan ? `Triwulan ${filterTriwulan}` : months[filterMonth]}
              </p>
            </div>
          </div>

          {/* Tombol aksi */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <button
              onClick={handleToggleApproval}
              disabled={isTogglingApproval || !eligible}
              className={cn(
                'w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors',
                isApproved
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : eligible
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              {isTogglingApproval ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isApproved ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {isTogglingApproval
                ? 'Memproses...'
                : isApproved
                ? 'Batalkan Persetujuan'
                : 'Setujui Bulan Ini'}
            </button>
            {!eligible && !isApproved && (
              <p className="text-xs text-rose-600 text-center mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Guru belum memenuhi syarat kelengkapan minimal 80%
              </p>
            )}
          </div>

          {/* Daftar jurnal */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Daftar Jurnal
              </p>
            </div>
            {journals.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Belum ada jurnal di periode ini</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {journals.map((j) => (
                  <div key={j.id} className="p-4">
                    <p className="font-semibold text-sm text-slate-800 mb-2">
                      {format(parseISO(j.date), 'EEEE, d MMMM yyyy', { locale: localeId })}
                    </p>
                    <div className="space-y-1.5 ml-2">
                      {j.activities.map((act, i) => (
                        <div key={i} className="flex gap-3 text-xs text-slate-600">
                          <span className="font-mono text-slate-400 shrink-0 w-20">
                            {act.jam || '-'}
                          </span>
                          <span className="flex-1">
                            <span className="font-semibold">{act.jenisKegiatan || '-'}</span>
                            {act.agendaMapel && <span> · {act.agendaMapel}</span>}
                            {act.lokasiKelas && <span> · {act.lokasiKelas}</span>}
                            {act.kegiatanTujuan && (
                              <p className="text-slate-500 mt-0.5">{act.kegiatanTujuan}</p>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}