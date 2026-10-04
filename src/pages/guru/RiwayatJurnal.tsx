import { useMemo, useState } from 'react';
import {
  History, Calendar, FileText, Edit, Trash2, ChevronDown, ChevronRight,
  Download, Search, XCircle,
} from 'lucide-react';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { JournalEntry, TabKey } from '../../types';
import { cn } from '../../lib/utils';

interface RiwayatJurnalProps {
  journals: JournalEntry[];
  onNavigate: (tab: TabKey) => void;
  onDelete?: (id: string) => void;
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function RiwayatJurnal({ journals, onNavigate, onDelete }: RiwayatJurnalProps) {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(getMonth(now));
  const [filterYear, setFilterYear] = useState<number>(getYear(now));
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filter
  const filtered = useMemo(() => {
    let list = journals.filter((j) => {
      const d = parseISO(j.date);
      return getMonth(d) === filterMonth && getYear(d) === filterYear;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.activities.some(
          (a) =>
            (a.jenisKegiatan || '').toLowerCase().includes(q) ||
            (a.agendaMapel || a.subject || '').toLowerCase().includes(q) ||
            (a.kegiatanTujuan || a.goal || a.activity || '').toLowerCase().includes(q) ||
            (a.lokasiKelas || a.class || '').toLowerCase().includes(q)
        )
      );
    }

    return list.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [journals, filterMonth, filterYear, search]);

  // Statistik bulan ini
  const monthStats = useMemo(() => {
    const monthJournals = journals.filter((j) => {
      const d = parseISO(j.date);
      return getMonth(d) === filterMonth && getYear(d) === filterYear;
    });
    return {
      days: monthJournals.length,
      activities: monthJournals.reduce((s, j) => s + (j.activities?.length || 0), 0),
    };
  }, [journals, filterMonth, filterYear]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const rows: string[][] = [];
    rows.push([
      'No', 'Tanggal', 'Jam', 'Jenis Kegiatan', 'Agenda/Mapel',
      'Lokasi/Kelas', 'Kegiatan/Tujuan', 'Keterangan',
    ]);

    filtered
      .slice()
      .reverse()
      .forEach((j) => {
        const dateStr = format(parseISO(j.date), 'yyyy-MM-dd');
        j.activities.forEach((act, actIdx) => {
          rows.push([
            actIdx === 0 ? String(rows.length) : '',
            actIdx === 0 ? dateStr : '',
            act.jam || '',
            act.jenisKegiatan || '',
            act.agendaMapel || act.subject || '',
            act.lokasiKelas || act.class || '',
            act.kegiatanTujuan || act.goal || act.activity || '',
            act.keterangan || '',
          ]);
        });
      });

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riwayat_Jurnal_${months[filterMonth]}_${filterYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Riwayat Jurnal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {monthStats.days} hari · {monthStats.activities} kegiatan terdata
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2 py-2 font-semibold text-slate-700"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2 py-2 font-semibold text-slate-700"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => onNavigate('journal')}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Input Baru
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kegiatan, mapel, kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
            >
              <XCircle className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">
            {search ? 'Tidak ada jurnal yang cocok' : 'Belum ada jurnal bulan ini'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {search ? 'Coba kata kunci lain' : 'Mulai input jurnal kegiatan Anda'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((j) => {
            const isExpanded = expandedId === j.id;
            const dateObj = parseISO(j.date);
            const totalAct = j.activities.length;

            return (
              <div
                key={j.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Header kartu */}
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : j.id)}
                >
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 flex flex-col items-center justify-center shrink-0 border border-indigo-100">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">
                      {format(dateObj, 'MMM', { locale: localeId })}
                    </span>
                    <span className="text-lg font-bold text-indigo-700 leading-none">
                      {format(dateObj, 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">
                      {format(dateObj, 'EEEE', { locale: localeId })}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {totalAct} kegiatan · {format(dateObj, 'd MMMM yyyy', { locale: localeId })}
                    </p>
                  </div>
                  <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Detail expand */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    {j.activities.map((act, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg border border-slate-200 p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">
                            #{i + 1}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {act.jam || '-'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                              Jenis Kegiatan
                            </p>
                            <p className="text-slate-700">{act.jenisKegiatan || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                              Agenda / Mapel
                            </p>
                            <p className="text-slate-700">
                              {act.agendaMapel || act.subject || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                              Lokasi / Kelas
                            </p>
                            <p className="text-slate-700">
                              {act.lokasiKelas || act.class || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                              Keterangan
                            </p>
                            <p className="text-slate-700">{act.keterangan || '-'}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                              Kegiatan / Tujuan Pembelajaran
                            </p>
                            <p className="text-slate-700">
                              {act.kegiatanTujuan || act.goal || act.activity || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Aksi */}
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      <button
                        onClick={() => onNavigate('journal')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit di Input Jurnal
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => setConfirmDelete(j.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Hapus Jurnal?</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Data jurnal akan dihapus permanen dari server.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onDelete) onDelete(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}