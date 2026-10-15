import { useEffect, useState } from 'react';
import {
  BarChart3, Users, Key, School, Loader2, Trash2, RefreshCw,
  Search, Plus, X, AlertCircle, User, Award, Shield, FileText,
  UserCog, TrendingUp, Activity, CheckCircle2, Clock,
} from 'lucide-react';
import {
  getAdminStats, loadAllUsers, deleteUserByAdmin,
  loadInviteCodes, generateInviteCodes, revokeInviteCode,
  loadMasterSekolah, addMasterSekolah,
  getJournalsLast7Days, getTopGurusThisMonth, getRecentActivity,
} from '../../lib/db';
import type {
  AdminStats, AdminUserRow, InviteCode, MasterSekolahRow,
  DailyJournalCount, TopGuru, RecentActivity,
} from '../../types';
import { cn } from '../../lib/utils';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

type AdminTab = 'stats' | 'users' | 'codes' | 'schools';

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'slate';
const colorMap: Record<ColorKey, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
  purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', fg: 'text-indigo-600' },
  slate: { bg: 'bg-slate-100', fg: 'text-slate-500' },
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
          <span className={c.fg}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dailyJournals, setDailyJournals] = useState<DailyJournalCount[]>([]);
  const [topGurus, setTopGurus] = useState<TopGuru[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [showGenForm, setShowGenForm] = useState(false);
  const [genRole, setGenRole] = useState<'kepala_sekolah' | 'pengawas'>('kepala_sekolah');
  const [genCount, setGenCount] = useState(1);
  const [genPrefix, setGenPrefix] = useState('KS');
  const [genNotes, setGenNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  const [schools, setSchools] = useState<MasterSekolahRow[]>([]);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newNpsn, setNewNpsn] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKecamatan, setNewKecamatan] = useState('');
  const [addingSchool, setAddingSchool] = useState(false);

  const loadTabData = async (t: AdminTab) => {
    setLoading(true);
    setError('');
    try {
      if (t === 'stats') {
        const [s, dj, tg, ra] = await Promise.all([
          getAdminStats(),
          getJournalsLast7Days(),
          getTopGurusThisMonth(5),
          getRecentActivity(10),
        ]);
        setStats(s);
        setDailyJournals(dj);
        setTopGurus(tg);
        setRecentActivity(ra);
      } else if (t === 'users') setUsers(await loadAllUsers());
      else if (t === 'codes') setCodes(await loadInviteCodes());
      else if (t === 'schools') setSchools(await loadMasterSekolah());
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(tab); }, [tab]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserByAdmin(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      alert('Gagal menghapus: ' + (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newCodes = await generateInviteCodes(genRole, genCount, genPrefix, genNotes);
      alert(`Berhasil membuat ${newCodes.length} kode:\n\n${newCodes.join('\n')}`);
      setShowGenForm(false);
      setGenNotes('');
      setCodes(await loadInviteCodes());
    } catch (e) {
      alert('Gagal: ' + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (c: InviteCode) => {
    if (!confirm(`Hapus kode ${c.code}?`)) return;
    try {
      await revokeInviteCode(c.id);
      setCodes((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      alert('Gagal: ' + (e as Error).message);
    }
  };

  const handleAddSchool = async () => {
    if (!newNpsn.trim() || !newNama.trim()) {
      alert('NPSN dan Nama Sekolah wajib diisi');
      return;
    }
    if (!/^\d{8}$/.test(newNpsn.trim())) {
      alert('NPSN harus 8 digit angka');
      return;
    }
    setAddingSchool(true);
    try {
      await addMasterSekolah(newNpsn, newNama, newKecamatan);
      setShowAddSchool(false);
      setNewNpsn(''); setNewNama(''); setNewKecamatan('');
      setSchools(await loadMasterSekolah());
    } catch (e) {
      alert('Gagal: ' + (e as Error).message);
    } finally {
      setAddingSchool(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (userFilter !== 'all' && u.role !== userFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return u.email.toLowerCase().includes(q)
        || (u.name || '').toLowerCase().includes(q)
        || (u.nip || '').toLowerCase().includes(q);
    }
    return true;
  });

  const maxDayCount = Math.max(1, ...dailyJournals.map((d) => d.count));
  const totalWeekJournals = dailyJournals.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-4">
      {/* Header + Greeting */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-md p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg">Selamat datang, Administrator! 👋</h2>
            <p className="text-xs text-indigo-100 mt-0.5">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: localeId })}
            </p>
          </div>
          <button
            onClick={() => loadTabData(tab)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-semibold transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex gap-1 overflow-x-auto">
        {[
          { key: 'stats', label: 'Statistik', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
          { key: 'codes', label: 'Kode Undangan', icon: <Key className="w-4 h-4" /> },
          { key: 'schools', label: 'Sekolah', icon: <School className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as AdminTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap',
              tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && stats && (
        <>
          {/* Row 1: Users */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Users className="w-5 h-5" />} color="indigo"
              label="Total Users" value={stats.totalUsers} sub="Semua role" />
            <StatCard icon={<User className="w-5 h-5" />} color="blue"
              label="Guru" value={stats.totalGuru} sub="Aktif mengajar" />
            <StatCard icon={<Award className="w-5 h-5" />} color="purple"
              label="Kepala Sekolah" value={stats.totalKepsek} sub="Dari 3 sekolah" />
            <StatCard icon={<Shield className="w-5 h-5" />} color="amber"
              label="Pengawas" value={stats.totalPengawas} sub="Bina lintas sekolah" />
          </div>

          {/* Row 2: Content */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<FileText className="w-5 h-5" />} color="emerald"
              label="Total Jurnal" value={stats.totalJournals} sub="Semua periode" />
            <StatCard icon={<School className="w-5 h-5" />} color="rose"
              label="Sekolah" value={stats.totalSekolah} sub="Terdaftar" />
            <StatCard icon={<Key className="w-5 h-5" />} color="emerald"
              label="Kode Tersedia" value={stats.activeCodes} sub="Siap dipakai" />
            <StatCard icon={<Key className="w-5 h-5" />} color="amber"
              label="Kode Terpakai" value={stats.usedCodes} sub="Sudah diundang" />
          </div>

          {/* Grafik + Top Guru */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Grafik 7 hari */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <p className="font-bold text-slate-800 text-sm">Aktivitas 7 Hari Terakhir</p>
                </div>
                <span className="text-[11px] text-slate-500">
                  Total: <strong className="text-indigo-600">{totalWeekJournals}</strong> jurnal
                </span>
              </div>

              <div className="flex items-end justify-around gap-2 h-40 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-dashed border-slate-100"></div>
                  <div className="border-t border-dashed border-slate-100"></div>
                  <div className="border-t border-slate-200"></div>
                </div>

                {dailyJournals.map((d) => {
                  const height = d.count > 0 ? Math.max(8, (d.count / maxDayCount) * 100) : 3;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end relative z-10 h-full">
                      <span className={cn(
                        'text-[11px] font-bold mb-1',
                        d.isToday ? 'text-indigo-700' : 'text-slate-600'
                      )}>
                        {d.count}
                      </span>
                      <div
                        className={cn(
                          'w-full max-w-[44px] rounded-t-md shadow-sm transition-all',
                          d.isToday
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                            : 'bg-gradient-to-t from-indigo-400 to-indigo-300'
                        )}
                        style={{ height: `${height}%` }}
                      ></div>
                      <p className={cn(
                        'text-[10px] font-semibold mt-1.5 uppercase tracking-wide',
                        d.isToday ? 'text-indigo-700' : 'text-slate-500'
                      )}>
                        {d.dayName}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Guru */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-amber-600" />
                <p className="font-bold text-slate-800 text-sm">Top 5 Guru Teraktif</p>
              </div>

              {topGurus.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Belum ada data bulan ini</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topGurus.map((g, idx) => (
                    <div key={g.userId} className="flex items-center gap-2">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {g.name}
                        </p>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                            style={{ width: `${(g.journalCount / topGurus[0].journalCount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 shrink-0">
                        {g.journalCount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Log Aktivitas Terbaru */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-indigo-600" />
              <p className="font-bold text-slate-800 text-sm">Log Aktivitas Terbaru</p>
              <span className="text-[11px] text-slate-400 ml-auto">10 terakhir</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {recentActivity.map((a) => {
                  const ts = new Date(a.timestamp);
                  const diff = Math.floor((Date.now() - ts.getTime()) / 60000);
                  const timeAgo = diff < 1 ? 'baru saja'
                    : diff < 60 ? `${diff} menit lalu`
                    : diff < 1440 ? `${Math.floor(diff / 60)} jam lalu`
                    : `${Math.floor(diff / 1440)} hari lalu`;

                  return (
                    <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        a.type === 'journal' ? 'bg-blue-50 text-blue-600' :
                        'bg-emerald-50 text-emerald-600'
                      )}>
                        {a.type === 'journal' ? <FileText className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700">
                          <strong className="text-slate-900">{a.userName}</strong> — {a.description}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 flex flex-wrap gap-2 border-b border-slate-200">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, email, NIP..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">Semua Role</option>
              <option value="guru">Guru</option>
              <option value="kepala_sekolah">Kepala Sekolah</option>
              <option value="pengawas">Pengawas</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">Email</th>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">Nama</th>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">NIP</th>
                  <th className="text-center px-3 py-2 text-xs font-bold text-slate-700 uppercase">Role</th>
                  <th className="text-center px-3 py-2 text-xs font-bold text-slate-700 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs">{u.email}</td>
                    <td className="px-3 py-2 text-xs">{u.name || '-'}</td>
                    <td className="px-3 py-2 text-xs font-mono">{u.nip || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold',
                        u.role === 'admin' ? 'bg-red-100 text-red-700' :
                        u.role === 'kepala_sekolah' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'pengawas' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Hapus user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">Tidak ada user</div>
            )}
          </div>
        </div>
      )}

      {/* CODES TAB */}
      {tab === 'codes' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowGenForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" /> Generate Kode Baru
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">Kode</th>
                  <th className="text-center px-3 py-2 text-xs font-bold text-slate-700 uppercase">Role</th>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">Notes</th>
                  <th className="text-center px-3 py-2 text-xs font-bold text-slate-700 uppercase">Status</th>
                  <th className="text-center px-3 py-2 text-xs font-bold text-slate-700 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs font-bold">{c.code}</td>
                    <td className="px-3 py-2 text-center text-xs">{c.role}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{c.notes || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      {c.used_by ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Terpakai
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Tersedia
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {!c.used_by && (
                        <button
                          onClick={() => handleRevoke(c)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Hapus kode"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCHOOLS TAB */}
      {tab === 'schools' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddSchool(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" /> Tambah Sekolah
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">NPSN</th>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">Nama Sekolah</th>
                  <th className="text-left px-3 py-2 text-xs font-bold text-slate-700 uppercase">Kecamatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.map((s) => (
                  <tr key={s.npsn} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{s.npsn}</td>
                    <td className="px-3 py-2 text-xs font-semibold">{s.nama_sekolah}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{s.kecamatan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Hapus User */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800">Hapus User?</h4>
                <p className="text-sm text-slate-600 mt-1">
                  <strong>{deleteTarget.email}</strong> ({deleteTarget.role})
                </p>
                <p className="text-xs text-rose-600 mt-2">
                  ⚠️ Semua data user (profil, jurnal, verifikasi) akan dihapus permanen.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Generate Kode */}
      {showGenForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="font-bold text-slate-800">Generate Kode Undangan</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={genRole}
                  onChange={(e) => {
                    const r = e.target.value as 'kepala_sekolah' | 'pengawas';
                    setGenRole(r);
                    setGenPrefix(r === 'kepala_sekolah' ? 'KS' : 'PW');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="kepala_sekolah">Kepala Sekolah</option>
                  <option value="pengawas">Pengawas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix</label>
                <input
                  type="text"
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={genCount}
                  onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (opsional)</label>
                <input
                  type="text"
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="Contoh: Batch November 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowGenForm(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
              >
                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Sekolah */}
      {showAddSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="font-bold text-slate-800">Tambah Sekolah Baru</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NPSN (8 digit)</label>
                <input
                  type="text"
                  value={newNpsn}
                  onChange={(e) => setNewNpsn(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="40500733"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="SMP Negeri 1 Randangan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kecamatan (opsional)</label>
                <input
                  type="text"
                  value={newKecamatan}
                  onChange={(e) => setNewKecamatan(e.target.value)}
                  placeholder="Randangan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowAddSchool(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleAddSchool}
                disabled={addingSchool}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
              >
                {addingSchool && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
