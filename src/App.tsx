import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  FileText,
  User,
  BookOpen,
  Eye,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Loader2,
  Bell,
  Menu,
  X,
  Mail,
  Upload,
  LogOut,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { format, isWeekend, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, getMonth, getYear, addDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { TeacherData, JournalEntry, JournalActivity, INITIAL_TEACHER_DATA, HOLIDAYS_2026 } from './types';
import { saveAs } from 'file-saver';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  UnderlineType
} from 'docx';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './LoginPage';
import * as db from './lib/db';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { PlaceholderPage } from './components/PlaceholderPage';
import { DashboardGuru } from './pages/guru/DashboardGuru';
import { RiwayatJurnal } from './pages/guru/RiwayatJurnal';
import { DashboardPengawas } from './pages/pengawas/DashboardPengawas';
import { DaftarGuruBinaan } from './pages/pengawas/DaftarGuruBinaan';
import { DashboardKepsek } from './pages/kepsek/DashboardKepsek';
import { AntrianVerifikasi } from './pages/kepsek/AntrianVerifikasi';
import { SPTJMSekolah } from './pages/kepsek/SPTJMSekolah';
import { VerifikasiJurnal } from './pages/pengawas/VerifikasiJurnal';
import { Persetujuan } from './pages/pengawas/Persetujuan';
import { RiwayatRekomendasi } from './pages/pengawas/RiwayatRekomendasi';
import type { TabKey } from './types';
import { TopBar } from './components/TopBar';
import { getVerificationStatus, getKepsekSignature, getPengawasSignature } from './lib/db';
import { submitKepsekJournal } from './lib/db';

// --- Components ---

const DataRow = ({ label, value, colonPos = "170px" }: { label: string; value: string; colonPos?: string }) => (
  <table className="w-full border-none p-0 my-0.5 text-[12pt] font-tnr leading-[1.5]" style={{ borderCollapse: 'collapse', border: 'none', color: '#000000' }}>
    <tbody>
      <tr style={{ border: 'none' }}>
        <td style={{ width: colonPos, border: 'none', padding: '1px 0', verticalAlign: 'top', color: '#000000', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}>{label}</td>
        <td style={{ width: '15px', border: 'none', padding: '1px 0', verticalAlign: 'top', textAlign: 'center', color: '#000000', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}>:</td>
        <td style={{ border: 'none', padding: '1px 0', verticalAlign: 'top', fontWeight: 500, color: '#000000', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}>{value}</td>
      </tr>
    </tbody>
  </table>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void; key?: React.Key }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 30, scale: 0.95 }}
    className={cn(
      "fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px] border",
      type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    )}
  >
    {type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
    <span className="text-sm font-medium flex-1">{message}</span>
    <button onClick={onClose} className="hover:bg-black/5 p-1 rounded-md transition-all">
      <X className="w-4 h-4" />
    </button>
  </motion.div>
);

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className,
  disabled
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  disabled,
  error,
  hint,
  list,
  className
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  list?: string;
  className?: string;
}) => (
  <div className="flex flex-col w-full">
    <div className="flex justify-between items-center mb-1">
      <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1 leading-tight">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <span className="text-[10px] sm:text-xs text-slate-400 leading-none">{hint}</span>}
    </div>
    <input
      type={type}
      list={list}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 text-xs sm:text-sm disabled:bg-slate-50 disabled:text-slate-400",
        error ? "border-red-300 focus:ring-red-500" : "border-slate-200",
        className
      )}
    />
    {error && <p className="text-[10px] text-red-500 font-medium mt-0.5">{error}</p>}
  </div>
);

// --- Main App ---

export default function App() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppContent user={user} profile={profile} onSignOut={signOut} />;
}
const tabTitles: Record<TabKey, string> = {
  dashboard: 'Dashboard',
  profile: 'Profil',
  journal: 'Jurnal Kegiatan Harian',
  preview: 'Preview Dokumen',
  history: 'Riwayat Jurnal',
  pw_dashboard: 'Dashboard Pengawas',
  pw_teachers: 'Daftar Guru Binaan',
  pw_verify: 'Verifikasi Jurnal',
  pw_approve: 'Persetujuan',
  pw_rec_history: 'Riwayat Rekomendasi',
  ks_dashboard: 'Dashboard Kepala Sekolah',
  ks_queue: 'Antrian Verifikasi',
  ks_teachers: 'Semua Guru',
  ks_history: 'Riwayat Verifikasi',
  ks_preview: 'Preview Dokumen',
  ks_sptjm: 'SPTJM Sekolah',
  ks_journal: 'Input Jurnal',
  ks_journal_history: 'Riwayat Jurnal',
};
function AppContent({
  user: _user,
  profile,
  onSignOut,
}: {
  user: SupabaseUser;
  profile: import('./types').UserProfile | null;
  onSignOut: () => void;
}) {
  const role = profile?.role || 'guru';
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [lastRole, setLastRole] = useState<string | null>(null);

  // Reset tab saat role berubah / login pertama dengan role tertentu
  useEffect(() => {
    if (profile && profile.role !== lastRole) {
      if (profile.role === 'pengawas') {
        setActiveTab('pw_dashboard');
      } else if (profile.role === 'kepala_sekolah') {
        setActiveTab('ks_dashboard');
      } else {
        setActiveTab('dashboard');
      }
      setLastRole(profile.role);
    }
  }, [profile, lastRole]);
const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [teacher, setTeacher] = useState<TeacherData>(INITIAL_TEACHER_DATA);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [approvals, setApprovals] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const [rows, setRows] = useState<JournalActivity[]>([{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const selectedDate = parseISO(selectedDateStr);
  const isWorkDay = !isWeekend(selectedDate) && !HOLIDAYS_2026.includes(selectedDateStr);
  const [showDatePickerPopover, setShowDatePickerPopover] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const addRow = () => {
    if (rows.length >= 9) return;
    setRows(prev => [...prev, { jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
  };

  const addNotification = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).slice(2);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load dari Supabase saat mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, j, a] = await Promise.all([
          db.loadTeacher(),
          db.loadJournals(),
          db.loadApprovals(),
        ]);
        if (!mounted) return;
        if (t) setTeacher(t);
        setJournals(j);
        setApprovals(a);
      } catch (e) {
        console.error('Load error:', e);
        if (mounted) addNotification('Gagal memuat data dari server', 'error');
      } finally {
        if (mounted) setIsLoadingData(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveTeacher = async (data: TeacherData) => {
    setTeacher(data);
    try {
      await db.saveTeacher(data);
      addNotification('Data profil berhasil disimpan!', 'success');
    } catch (e) {
      console.error(e);
      addNotification('Gagal simpan ke server: ' + (e as Error).message, 'error');
    }
  };

  const handleAddJournal = async (entry: JournalEntry) => {
    try {
      const newId = await db.upsertJournal(entry);
      setJournals(prev => [...prev, { ...entry, id: newId }]);
    } catch (e) {
      console.error(e);
      addNotification('Gagal simpan jurnal: ' + (e as Error).message, 'error');
      throw e;
    }
  };

  const handleUpdateJournal = async (id: string, updated: JournalEntry) => {
    try {
      await db.updateJournal(id, updated);
      setJournals(prev => prev.map(j => (j.id === id ? updated : j)));
    } catch (e) {
      console.error(e);
      addNotification('Gagal update jurnal: ' + (e as Error).message, 'error');
      throw e;
    }
  };

  const handleDeleteJournal = async (id: string) => {
    try {
      await db.deleteJournal(id);
      setJournals(prev => prev.filter(j => j.id !== id));
      addNotification('Jurnal berhasil dihapus!', 'success');
    } catch (e) {
      console.error(e);
      addNotification('Gagal hapus: ' + (e as Error).message, 'error');
    }
  };

  return (
    <div className="h-screen w-screen flex bg-slate-100 overflow-hidden lg:p-3 lg:gap-3">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        teacher={teacher}
        profile={profile}
        onSignOut={onSignOut}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white lg:rounded-xl overflow-hidden">
        <TopBar
          title={tabTitles[activeTab]}
          teacherName={teacher.name}
          teacherNip={teacher.nip}
          teacherPhoto={teacher.profilePhoto}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-3 text-sm text-slate-500 font-medium">Memuat data...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
                          {activeTab === 'ks_dashboard' && profile && (
                <motion.div key="ks_dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <DashboardKepsek
  profile={profile}
  teacher={teacher}
  journals={journals}
  addNotification={addNotification}
/>
                </motion.div>
              )}
              {activeTab === 'ks_queue' && profile && (
                <motion.div key="ks_queue" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <AntrianVerifikasi profile={profile} addNotification={addNotification} />
                </motion.div>
              )}
                            {activeTab === 'ks_preview' && profile && (
                <motion.div key="ks_preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <PreviewSection
                    teacher={teacher}
                    journals={journals}
                    approvals={approvals}
                    role="kepala_sekolah"
                    onToggleApproval={async (key) => {
                      const wasApproved = approvals.includes(key);
                      try {
                        await db.setApproval(key, !wasApproved);
                        setApprovals(prev =>
                          wasApproved ? prev.filter(k => k !== key) : [...prev, key]
                        );
                        addNotification('Status persetujuan diperbarui!', 'success');
                      } catch (e) {
                        console.error(e);
                        addNotification('Gagal update status: ' + (e as Error).message, 'error');
                      }
                    }}
                    addNotification={addNotification}
                    onUpdateTeacher={handleSaveTeacher}
                  />
                </motion.div>
              )}

              {activeTab === 'ks_sptjm' && profile && (
                <motion.div key="ks_sptjm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <SPTJMSekolah teacher={teacher} addNotification={addNotification} />
                </motion.div>
              )}

              {activeTab === 'ks_journal' && profile && (
                <motion.div key="ks_journal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <JournalInput
                    onAdd={handleAddJournal}
                    onUpdate={handleUpdateJournal}
                    journals={journals}
                    onDelete={handleDeleteJournal}
                    addNotification={addNotification}
                    teacher={teacher}
                    rows={rows}
                    setRows={setRows}
                    selectedDateStr={selectedDateStr}
                    setSelectedDateStr={setSelectedDateStr}
                    addRow={addRow}
                    onOpenDatePicker={() => setShowDatePickerPopover(true)}
                  />
                </motion.div>
              )}

              {activeTab === 'ks_journal_history' && (
                <motion.div key="ks_journal_history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <RiwayatJurnal
                    journals={journals}
                    onNavigate={setActiveTab}
                    onDelete={handleDeleteJournal}
                  />
                </motion.div>
              )}

                                          {activeTab === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <DashboardGuru
                    teacher={teacher}
                    journals={journals}
                    approvals={approvals}
                    onNavigate={setActiveTab}
                  />
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <RiwayatJurnal
                    journals={journals}
                    onNavigate={setActiveTab}
                    onDelete={handleDeleteJournal}
                  />
                </motion.div>
              )}

              {activeTab === 'pw_dashboard' && profile && (
                <motion.div key="pw_dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <DashboardPengawas
                    profile={profile}
                    teacher={teacher}
                    onNavigate={setActiveTab}
                    addNotification={addNotification}
                  />
                </motion.div>
              )}

              {activeTab === 'pw_teachers' && profile && (
                <motion.div key="pw_teachers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <DaftarGuruBinaan
                    profile={profile}
                    onNavigate={setActiveTab}
                    addNotification={addNotification}
                  />
                </motion.div>
              )}

              {activeTab === 'pw_verify' && profile && (
                <motion.div key="pw_verify" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <VerifikasiJurnal
                    profile={profile}
                    addNotification={addNotification}
                  />
                </motion.div>
              )}

              {activeTab === 'pw_approve' && profile && (
                <motion.div key="pw_approve" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <Persetujuan
                    profile={profile}
                    addNotification={addNotification}
                  />
                </motion.div>
              )}

              {activeTab === 'pw_rec_history' && profile && (
                <motion.div key="pw_rec_history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <RiwayatRekomendasi
                    profile={profile}
                    addNotification={addNotification}
                  />
                </motion.div>
              )}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ProfileForm data={teacher} onSave={handleSaveTeacher} role={role} />
                </motion.div>
              )}

              {activeTab === 'journal' && (
                <motion.div
                  key="journal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <JournalInput
                    onAdd={handleAddJournal}
                    onUpdate={handleUpdateJournal}
                    journals={journals}
                    onDelete={handleDeleteJournal}
                    addNotification={addNotification}
                    teacher={teacher}
                    rows={rows}
                    setRows={setRows}
                    selectedDateStr={selectedDateStr}
                    setSelectedDateStr={setSelectedDateStr}
                    addRow={addRow}
                    onOpenDatePicker={() => setShowDatePickerPopover(true)}
                  />
                </motion.div>
              )}

              {activeTab === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <PreviewSection
                    teacher={teacher}
                    journals={journals}
                    approvals={approvals}
                    role="guru"
                    onToggleApproval={async (key) => {
                      const wasApproved = approvals.includes(key);
                      try {
                        await db.setApproval(key, !wasApproved);
                        setApprovals(prev =>
                          wasApproved ? prev.filter(k => k !== key) : [...prev, key]
                        );
                        addNotification('Status persetujuan diperbarui!', 'success');
                      } catch (e) {
                        console.error(e);
                        addNotification('Gagal update status: ' + (e as Error).message, 'error');
                      }
                    }}
                    addNotification={addNotification}
                    onUpdateTeacher={handleSaveTeacher}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      <AnimatePresence>
        {notifications.map(n => (
          <Toast key={n.id} message={n.message} type={n.type} onClose={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        active ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white",
        collapsed && "justify-center"
      )}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
}

// --- Sub-components ---

function LogoUploader({
  label,
  value,
  onChange,
  hint
}: {
  label: string;
  value?: string;
  onChange: (val: string) => void;
  hint?: string;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file logo maksimal 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs sm:text-sm font-semibold text-slate-700">{label}</label>
        {hint && <span className="text-[10px] sm:text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="flex items-center gap-2.5 p-2 border border-slate-200 rounded-lg bg-slate-50/50">
        <div className="w-11 h-11 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain p-0.5" />
          ) : (
            <Upload className="w-4 h-4 text-slate-300" />
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md transition-colors border border-indigo-200/60">
            <Upload className="w-3.5 h-3.5" />
            <span>{value ? 'Ganti' : 'Pilih Logo'}</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
              title="Hapus Logo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileForm({
  data,
  onSave,
  role = 'guru',
}: {
  data: TeacherData;
  onSave: (d: TeacherData) => void;
  role?: 'guru' | 'kepala_sekolah' | 'pengawas';
}) {
  const [form, setForm] = useState<TeacherData>(data);

  useEffect(() => {
    setForm(data);
  }, [data]);

  return (
    <Card className="p-5 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center pb-3 mb-5 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <User className="w-5 h-5 text-indigo-600" />
          {role === 'pengawas'
  ? 'PROFIL PENGAWAS'
  : role === 'kepala_sekolah'
  ? 'PROFIL KEPALA SEKOLAH'
  : 'PROFIL GURU & SATUAN PENDIDIKAN'}
        </h3>
        <Button onClick={() => onSave(form)} className="px-5 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wide">
          <Save className="w-4 h-4" /> SIMPAN PROFIL
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (7 cols): Identitas Guru & Satuan Pendidikan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input label="Nama Lengkap" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Nama Lengkap & Gelar" required />
            <Input label="NIP" value={form.nip} onChange={(v) => setForm({ ...form, nip: v })} placeholder="19xxxxxxxxxxxxxx" required />
            <Input label="Jabatan" value={form.position} onChange={(v) => setForm({ ...form, position: v })} placeholder="Guru Madya / Muda" required />
            <Input label="Mata Pelajaran" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Matematika" required />
            <Input label="Pangkat / Golongan" value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} placeholder="Pembina, IV/a" />
            <Input label="Instansi" value={form.institution || ''} onChange={(v) => setForm({ ...form, institution: v })} placeholder="Dinas Pendidikan dan Kebudayaan" />
            <Input
              label={role === 'pengawas' ? 'Unit Kerja Pengawas' : 'Unit Kerja'}
              value={form.workUnit}
              onChange={(v) => setForm({ ...form, workUnit: v })}
              placeholder={role === 'pengawas' ? 'Dinas Pendidikan / Pengawas' : 'SMPN 1 Randangan'}
              required
            />
            <Input label="Kecamatan" value={form.kecamatan} onChange={(v) => setForm({ ...form, kecamatan: v })} placeholder="Kecamatan Marisa" required />
            <Input label="NPSN" value={form.npsn} onChange={(v) => setForm({ ...form, npsn: v })} placeholder="10xxxxxx" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input label="Alamat Instansi" value={form.institutionAddress || ''} onChange={(v) => setForm({ ...form, institutionAddress: v })} placeholder="Jalan Ki Hajar Dewantara No. 8 Palopo" />
            <Input label="Alamat Unit Kerja" value={form.schoolAddress} onChange={(v) => setForm({ ...form, schoolAddress: v })} placeholder="Jl. xxxx No. xx" />
          </div>
        </div>

        {/* Right column (5 cols): Logo & Pejabat & Settings */}
        <div className="lg:col-span-5 space-y-4">
          {/* Foto Profil Guru Section */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <User className="w-4 h-4 text-indigo-600" /> FOTO PROFIL GURU
            </h4>
            <LogoUploader
              label="Foto Profil Guru"
              value={form.profilePhoto}
              onChange={(val) => setForm({ ...form, profilePhoto: val })}
              hint="Foto profil sudut kanan atas header"
            />
          </div>

          {/* Logo Kop Surat Section */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Upload className="w-4 h-4 text-indigo-600" /> LOGO KOP SURAT (KIRI & KANAN)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LogoUploader
                label="Logo Kabupaten"
                value={form.districtLogo}
                onChange={(val) => setForm({ ...form, districtLogo: val })}
              />
              <LogoUploader
                label="Logo Satuan Pendidikan"
                value={form.schoolLogo}
                onChange={(val) => setForm({ ...form, schoolLogo: val })}
              />
            </div>
          </div>

          {/* Pejabat Terkait */}
          <div className="p-3.5 sm:p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2.5">
            <h4 className="text-xs sm:text-sm font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> PEJABAT TERKAIT
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {role !== 'kepala_sekolah' && (
                <>
                  <Input label="Kepala Satuan Pendidikan" value={form.principalName} onChange={(v) => setForm({ ...form, principalName: v })} placeholder="Nama Kepala Satuan Pendidikan" />
                  <Input label="NIP Kepala Satuan Pendidikan" value={form.principalNip} onChange={(v) => setForm({ ...form, principalNip: v })} placeholder="NIP Kepala Satuan Pendidikan" />
                </>
              )}
              <Input label="Pengawas Bina" value={form.supervisorName} onChange={(v) => setForm({ ...form, supervisorName: v })} placeholder="Nama Pengawas" />
              <Input label="NIP Pengawas" value={form.supervisorNip} onChange={(v) => setForm({ ...form, supervisorNip: v })} placeholder="NIP Pengawas" />
              {role === 'kepala_sekolah' && (
                <>
                  <Input label="Kepala Dinas Pendidikan" value={form.headOfDeptName || ''} onChange={(v) => setForm({ ...form, headOfDeptName: v })} placeholder="Nama Kepala Dinas Pendidikan" />
                  <Input label="NIP Kepala Dinas" value={form.headOfDeptNip || ''} onChange={(v) => setForm({ ...form, headOfDeptNip: v })} placeholder="NIP Kepala Dinas" />
                </>
              )}
            </div>
          </div>
      </div>
    
          {/* TTD & Cap Digital — hanya kepsek/pengawas */}
          {(role === 'kepala_sekolah' || role === 'pengawas') && (
            <div className="p-3.5 sm:p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-2.5 lg:col-span-12">
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-amber-600" /> TANDA TANGAN & CAP DIGITAL
              </h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Upload scan tanda tangan dan cap Anda. Keduanya akan muncul otomatis di PDF jurnal/rekomendasi yang Anda verifikasi.
              </p>
              <LogoUploader
                label="Scan TTD + Cap"
                value={form.signatureStampImage}
                onChange={(val) => setForm({ ...form, signatureStampImage: val })}
                hint="Gabung TTD & cap dalam 1 gambar"
              />
            </div>
          )}
    </div>
    </Card>
  );
}

function JournalInput({
  onAdd,
  onUpdate,
  journals,
  onDelete,
  addNotification,
  teacher,
  rows,
  setRows,
  selectedDateStr,
  setSelectedDateStr,
  addRow,
  onOpenDatePicker
}: {
  onAdd: (e: JournalEntry) => void | Promise<void>;
  onUpdate: (id: string, e: JournalEntry) => void | Promise<void>;
  journals: JournalEntry[];
  onDelete: (id: string) => void;
  addNotification: (message: string, type: 'success' | 'error') => void;
  teacher: TeacherData;
  rows: JournalActivity[];
  setRows: React.Dispatch<React.SetStateAction<JournalActivity[]>>;
  selectedDateStr: string;
  setSelectedDateStr: (date: string) => void;
  addRow: () => void;
  onOpenDatePicker: () => void;
}) {
  const selectedDate = parseISO(selectedDateStr);
  const isWorkDay = !isWeekend(selectedDate) && !HOLIDAYS_2026.includes(selectedDateStr);

  const [isSendingKirim, setIsSendingKirim] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);

  const canInput = true;

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setSelectedDateStr(format(parseISO(entry.date), 'yyyy-MM-dd'));
    const mapped = entry.activities.map(a => ({
      jam: a.jam || '',
      jenisKegiatan: a.jenisKegiatan || '',
      agendaMapel: a.agendaMapel || a.subject || '',
      lokasiKelas: a.lokasiKelas || a.class || '',
      kegiatanTujuan: a.kegiatanTujuan || a.goal || a.activity || '',
      keterangan: a.keterangan || (a.studentCount !== undefined && a.studentCount > 0 ? `${a.studentCount} Siswa` : '')
    }));
    setRows(mapped.length > 0 ? mapped : [{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addNotification(`Mode edit aktif: Jurnal tanggal ${format(parseISO(entry.date), 'd MMMM yyyy', { locale: id })}`, 'success');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setRows([{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
    addNotification('Mode edit dibatalkan', 'error');
  };

  const handleKirim = async () => {
    const validRows = rows.filter(r =>
      (r.jam || '').trim() !== '' ||
      (r.jenisKegiatan || '').trim() !== '' ||
      (r.agendaMapel || r.subject || '').trim() !== '' ||
      (r.lokasiKelas || r.class || '').trim() !== '' ||
      (r.kegiatanTujuan || r.goal || r.activity || '').trim() !== '' ||
      (r.keterangan || '').trim() !== ''
    );

    if (validRows.length === 0) {
      addNotification('Minimal isi satu kegiatan!', 'error');
      return;
    }

    const isTeacherDataValid = teacher.name && teacher.workUnit && teacher.kecamatan && teacher.gasUrl;
    if (!isTeacherDataValid) {
      addNotification('Semua data profil (termasuk URL Web App di Profil) wajib diisi', 'error');
      return;
    }

    setIsSendingKirim(true);
    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const payload = {
          "No": (i + 1).toString(),
          "Hari / Tanggal": format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id }),
          "Nama Guru": teacher.name,
          "Unit Kerja": teacher.workUnit,
          "Kecamatan": teacher.kecamatan,
          "JAM": row.jam || '',
          "Jenis Kegiatan": row.jenisKegiatan || '',
          "Agenda / Mapel": row.agendaMapel || row.subject || '',
          "Lokasi / Kelas": row.lokasiKelas || row.class || '',
          "Kegiatan / Tujuan Pembelajaran": row.kegiatanTujuan || row.goal || row.activity || '',
          "Keterangan / Lampiran": row.keterangan || (row.studentCount !== undefined ? `${row.studentCount} Siswa` : '')
        };

        await fetch(teacher.gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      addNotification('Data terkirim ke Google Sheet (tidak dapat diverifikasi)', 'success');
      setRows([{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
      setEditingId(null);
    } catch (error) {
      console.error('Kirim Error:', error);
      addNotification('Gagal mengirim data', 'error');
    } finally {
      setIsSendingKirim(false);
    }
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r =>
      (r.agendaMapel || r.subject || '').trim() !== '' ||
      (r.kegiatanTujuan || r.goal || r.activity || '').trim() !== '' ||
      (r.jenisKegiatan || '').trim() !== '' ||
      (r.jam || '').trim() !== ''
    );
    if (validRows.length === 0) {
      addNotification('Minimal isi satu data kegiatan!', 'error');
      return;
    }

    if (editingId) {
      const duplicate = journals.some(j => j.id !== editingId && isSameDay(parseISO(j.date), selectedDate));
      if (duplicate) {
        addNotification(`Jurnal untuk tanggal ${format(selectedDate, 'd MMMM yyyy', { locale: id })} sudah ada di entri lain!`, 'error');
        return;
      }

      try {
        await onUpdate(editingId, {
          id: editingId,
          date: selectedDateStr,
          activities: validRows
        });
        setEditingId(null);
        setRows([{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
        addNotification(`Jurnal tanggal ${format(selectedDate, 'd MMMM yyyy', { locale: id })} berhasil diperbarui!`, 'success');
      } catch {
        // error sudah di-handle di parent
      }
      return;
    }

    if (journals.some(j => isSameDay(parseISO(j.date), selectedDate))) {
      addNotification(`Jurnal untuk tanggal ${format(selectedDate, 'd MMMM yyyy', { locale: id })} sudah diisi! Gunakan tombol Edit pada Riwayat untuk mengubah.`, 'error');
      return;
    }

    const entry: JournalEntry = {
      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      date: selectedDateStr,
      activities: validRows
    };

    try {
      await onAdd(entry);
      setRows([{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
      addNotification(`Jurnal tanggal ${format(selectedDate, 'd MMMM yyyy', { locale: id })} berhasil ditambahkan!`, 'success');
    } catch {
      // error sudah di-handle di parent
    }
  };

  const handleKirimEmailToday = () => {
    if (!teacher.targetEmail || !teacher.targetEmail.trim()) {
      addNotification('Silakan isi email tujuan terlebih dahulu di Data Guru!', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(teacher.targetEmail.trim())) {
      addNotification('Format email tidak valid!', 'error');
      return;
    }

    const validRows = rows.filter(r =>
      (r.jam || '').trim() !== '' ||
      (r.jenisKegiatan || '').trim() !== '' ||
      (r.agendaMapel || r.subject || '').trim() !== '' ||
      (r.lokasiKelas || r.class || '').trim() !== '' ||
      (r.kegiatanTujuan || r.goal || r.activity || '').trim() !== '' ||
      (r.keterangan || '').trim() !== ''
    );
    if (validRows.length === 0) {
      addNotification('Minimal isi satu kegiatan!', 'error');
      return;
    }

    let body = `Yth. Bapak/Ibu,\n\n`;
    body += `Berikut kami kirimkan Jurnal Kegiatan Harian Guru untuk:\n\n`;
    body += `--- PROFIL GURU ---\n`;
    body += `Nama Lengkap     : ${teacher.name || '-'}\n`;
    body += `NIP              : ${teacher.nip || '-'}\n`;
    body += `Jabatan          : ${teacher.position || '-'}\n`;
    body += `Mata Pelajaran   : ${teacher.subject || '-'}\n`;
    body += `Unit Kerja       : ${teacher.workUnit || '-'}\n`;
    body += `Kecamatan        : ${teacher.kecamatan || '-'}\n`;
    body += `Pangkat/Golongan : ${teacher.grade || '-'}\n`;
    body += `NPSN             : ${teacher.npsn || '-'}\n`;
    body += `Tanggal Jurnal   : ${format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}\n\n`;

    body += `--- KEGIATAN JURNAL ---\n\n`;

    validRows.forEach((row, index) => {
      body += `Kegiatan #${index + 1}\n`;
      body += `JAM                           : ${row.jam || '-'}\n`;
      body += `Jenis Kegiatan                : ${row.jenisKegiatan || '-'}\n`;
      body += `Agenda / Mapel                : ${row.agendaMapel || row.subject || '-'}\n`;
      body += `Lokasi / Kelas                : ${row.lokasiKelas || row.class || '-'}\n`;
      body += `Kegiatan / Tujuan Pembelajaran: ${row.kegiatanTujuan || row.goal || row.activity || '-'}\n`;
      body += `Keterangan / Lampiran         : ${row.keterangan || (row.studentCount !== undefined ? `${row.studentCount} Siswa` : '-')}\n`;
      body += `--------------------------------------------------\n\n`;
    });

    body += `--- PEJABAT TERKAIT ---\n`;
    body += `Kepala Sekolah : ${teacher.principalName || '-'} (NIP. ${teacher.principalNip || '-'})\n`;
    body += `Pengawas Bina  : ${teacher.supervisorName || '-'} (NIP. ${teacher.supervisorNip || '-'})\n\n`;

    body += `Dikirim dari Aplikasi Jurnal Harian Guru.`;

    const subject = `Jurnal Kegiatan Harian Guru - ${teacher.name || 'Guru'} (${format(selectedDate, 'd MMM yyyy', { locale: id })})`;
    const mailtoUrl = `mailto:${encodeURIComponent(teacher.targetEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
    addNotification('Aplikasi email berhasil dibuka!', 'success');
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof JournalActivity, val: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: val };
    setRows(newRows);
  };

  return (
    <div className="space-y-4">
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">Hapus Jurnal?</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data jurnal untuk tanggal <span className="font-semibold text-slate-800">{format(parseISO(deleteTarget.date), 'EEEE, d MMMM yyyy', { locale: id })}</span>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const idToDelete = deleteTarget.id;
                  onDelete(idToDelete);
                  if (editingId === idToDelete) {
                    setEditingId(null);
                    setRows([{ jam: '', jenisKegiatan: '', agendaMapel: '', lokasiKelas: '', kegiatanTujuan: '', keterangan: '' }]);
                  }
                  setDeleteTarget(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Jurnal
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className={cn("p-4 sm:p-5 transition-all", editingId ? "border-amber-300 ring-2 ring-amber-100" : "")}>
        {editingId && (
          <div className="mb-4 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sedang Mengedit Jurnal: {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}</span>
            </div>
            <button
              onClick={handleCancelEdit}
              className="text-xs text-amber-800 hover:text-amber-950 font-semibold px-2.5 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Batalkan proses edit dan kosongkan form"
            >
              <X className="w-3.5 h-3.5" /> Batal Edit
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                {editingId ? 'EDIT JURNAL KEGIATAN' : 'INPUT JURNAL KEGIATAN'}
              </h3>
              {editingId && (
                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  Mode Edit
                </span>
              )}
            </div>
            <p
              onClick={onOpenDatePicker}
              className="text-slate-500 text-xs flex items-center gap-2 mt-0.5 cursor-pointer hover:text-indigo-600 transition-colors"
              title="Klik untuk Ganti Tanggal via Profil"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold text-slate-700 hover:underline">
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
              </span>
              {!isWorkDay && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                  Hari Libur / Akhir Pekan
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {rows.length < 9 && (
              <button
                onClick={addRow}
                className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
                title="Tambah Kegiatan Berikutnya (+)"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah Kegiatan</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-2 relative">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Kegiatan #{index + 1}</span>
                <div className="flex items-center gap-2">
                  {canInput && rows.length < 9 && index === rows.length - 1 && (
                    <button
                      onClick={addRow}
                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer"
                      title="Tambah Kegiatan Berikutnya"
                    >
                      <Plus className="w-3 h-3" /> Tambah Kegiatan
                    </button>
                  )}
                  {canInput && (
                    <button onClick={() => removeRow(index)} className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer" title="Hapus Kegiatan">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 items-end">
                <Input
                  label="JAM"
                  value={row.jam || ''}
                  onChange={(v) => updateRow(index, 'jam', v)}
                  placeholder="07.30 - 09.00"
                  disabled={!canInput}
                />
                <div>
                  <Input
                    label="Jenis Kegiatan"
                    value={row.jenisKegiatan || ''}
                    onChange={(v) => updateRow(index, 'jenisKegiatan', v)}
                    placeholder="KBM / Rapat"
                    disabled={!canInput}
                  />
                </div>
                <Input
                  label="Agenda / Mapel"
                  value={row.agendaMapel || row.subject || ''}
                  onChange={(v) => updateRow(index, 'agendaMapel', v)}
                  placeholder="Matematika"
                  disabled={!canInput}
                />
                <Input
                  label="Lokasi / Kelas"
                  value={row.lokasiKelas || row.class || ''}
                  onChange={(v) => updateRow(index, 'lokasiKelas', v)}
                  placeholder="VIII-A"
                  disabled={!canInput}
                />
                <Input
                  label="Kegiatan / Tujuan"
                  value={row.kegiatanTujuan || row.goal || row.activity || ''}
                  onChange={(v) => updateRow(index, 'kegiatanTujuan', v)}
                  placeholder="Uraian kegiatan..."
                  disabled={!canInput}
                />
                <Input
                  label="Keterangan"
                  value={row.keterangan || (row.studentCount !== undefined && row.studentCount > 0 ? `${row.studentCount} Siswa` : '')}
                  onChange={(v) => updateRow(index, 'keterangan', v)}
                  placeholder="Hadir 28 siswa"
                  disabled={!canInput}
                />
              </div>
            </div>
          ))}

          {canInput && rows.length < 9 && (
            <button
              onClick={addRow}
              className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Kegiatan
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2.5 pt-3 border-t border-slate-200">
          <Button
            onClick={handleSubmit}
            disabled={!canInput}
            className={cn(
              "px-4 py-1.5 text-xs uppercase tracking-wide cursor-pointer",
              editingId ? "bg-amber-600 hover:bg-amber-700" : ""
            )}
          >
            <Save className="w-3.5 h-3.5" /> {editingId ? `SIMPAN PERUBAHAN (${format(selectedDate, 'd MMM yyyy', { locale: id }).toUpperCase()})` : `SIMPAN JURNAL (${format(selectedDate, 'd MMM yyyy', { locale: id }).toUpperCase()})`}
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">RIWAYAT JURNAL TERBARU</h3>
          {journals.length > 0 && (
            <span className="text-xs text-slate-500 font-medium">{journals.length} Jurnal Tersimpan</span>
          )}
        </div>
        {journals.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-lg border border-dashed border-slate-300">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Belum ada data jurnal yang diinput.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {journals.slice().reverse().map(j => {
              const isCurrentlyEditing = editingId === j.id;
              return (
                <div key={j.id}>
                  <Card className={cn(
                    "p-3 flex justify-between items-start transition-all",
                    isCurrentlyEditing ? "border-amber-400 bg-amber-50/50 ring-2 ring-amber-300" : "hover:border-slate-300"
                  )}>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-xs text-slate-800">
                          {format(parseISO(j.date), 'EEEE, d MMM yyyy', { locale: id })}
                        </p>
                        {isCurrentlyEditing && (
                          <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                            Sedang Diedit
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {j.activities.map(a => a.agendaMapel || a.subject || a.jenisKegiatan || 'Kegiatan').filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(j)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all cursor-pointer",
                          isCurrentlyEditing
                            ? "bg-amber-200 text-amber-800 font-bold"
                            : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        )}
                        title="Edit Jurnal"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(j)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Hapus Jurnal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Preview Section ---
// ============ PDF JURNAL (autoTable, multi-halaman rapi, per-bulan untuk triwulan) ============
async function downloadJurnalPDF(
  teacher: TeacherData,
  journals: JournalEntry[],
  monthIdx: number,
  filterYear: number,
  useTriwulan: boolean,
  filterTriwulan: number,
  addNotification: (message: string, type: 'success' | 'error') => void,
  paperSize: 'A4' | 'F4' = 'F4'
) {
  const monthsList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  try {
    addNotification('Menyiapkan PDF Jurnal...', 'success');

    const paperDims: [number, number] = paperSize === 'A4' ? [297, 210] : [330, 215];

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: paperDims,
    });

    const pageW = 330;
    const pageH = 215;
    const marginL = 10;
    const marginR = 10;
    const marginT = 20;
    const marginB = 10;
    const startTableY = 82;

    // Ambil user ID guru untuk cek verifikasi
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const guruUserId = currentUser?.id || '';

    // Deteksi role user (kepsek atau guru)
    let isKepsekUser = false;
    if (guruUserId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', guruUserId)
        .maybeSingle();
      isKepsekUser = profileData?.role === 'kepala_sekolah';
    }

    // Ambil TTD+Cap:
    // - User guru   → pakai TTD Kepsek (yang verifikasi jurnal guru)
    // - User kepsek → pakai TTD Pengawas (yang verifikasi jurnal kepsek)
    const officerSig = teacher.workUnit
      ? (isKepsekUser
          ? await getPengawasSignature(teacher.workUnit)
          : await getKepsekSignature(teacher.workUnit))
      : null;

    const officerLabel = isKepsekUser ? 'Pengawas Bina' : 'Kepala Satuan Pendidikan';
    const officerName = isKepsekUser
      ? (officerSig?.name || teacher.supervisorName || '................')
      : (teacher.principalName || '................');
    const officerNip = isKepsekUser
      ? (officerSig?.nip || teacher.supervisorNip || '................')
      : (teacher.principalNip || '................');

    // Helper: tanggal TTD (akhir bulan, geser ke hari kerja berikutnya jika weekend/libur)
    const getSignDate = (year: number, mIdx: number): Date => {
      let d = endOfMonth(new Date(year, mIdx));
      while (isWeekend(d) || HOLIDAYS_2026.includes(format(d, 'yyyy-MM-dd'))) {
        d = addDays(d, 1);
      }
      return d;
    };

    // ====== Fungsi gambar kop ======
    const drawKop = (yStart: number, bulanLabel: string): number => {
      let y = yStart;
      if (teacher.districtLogo) {
        try { doc.addImage(teacher.districtLogo, 'PNG', marginL, y, 22, 22); } catch { /* ignore */ }
      }
      if (teacher.schoolLogo) {
        try { doc.addImage(teacher.schoolLogo, 'PNG', pageW - marginR - 22, y, 22, 22); } catch { /* ignore */ }
      }
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('PEMERINTAH KABUPATEN POHUWATO', pageW / 2, y + 6, { align: 'center' });

      doc.setFontSize(14);
      doc.text(
        teacher.institution ? teacher.institution.toUpperCase() : 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
        pageW / 2,
        y + 13,
        { align: 'center' }
      );

      doc.setFontSize(16);
      doc.text(
        teacher.workUnit ? teacher.workUnit.toUpperCase() : 'SMP NEGERI RANDANGAN',
        pageW / 2,
        y + 21,
        { align: 'center' }
      );

      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.text(teacher.schoolAddress || '', pageW / 2, y + 26, { align: 'center' });

      y += 28;
      doc.setLineWidth(0.6);
      doc.line(marginL, y, pageW - marginR, y);
      doc.setLineWidth(0.2);
      doc.line(marginL, y + 1, pageW - marginR, y + 1);
      y += 9;
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text(
        isKepsekUser ? 'JURNAL KEGIATAN HARIAN KEPALA SATUAN PENDIDIKAN' : 'JURNAL KEGIATAN HARIAN GURU',
        pageW / 2,
        y,
        { align: 'center' }
      );
      y += 9;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const leftX = marginL;
      const rightX = pageW / 2 + 5;
      const labelW = 25;
      const infoRows = [
        { l: ['Nama', teacher.name], r: ['Unit Kerja', teacher.workUnit] },
        { l: ['NIP', teacher.nip], r: ['Kecamatan', teacher.kecamatan] },
        { l: ['Jabatan', teacher.position], r: ['Bulan', bulanLabel] },
      ];
      infoRows.forEach((row, i) => {
        const yy = y + i * 5.5;
        doc.text(row.l[0], leftX, yy);
        doc.text(':', leftX + labelW, yy);
        doc.text(row.l[1] || '-', leftX + labelW + 3, yy);
        doc.text(row.r[0], rightX, yy);
        doc.text(':', rightX + labelW, yy);
        doc.text(row.r[1] || '-', rightX + labelW + 3, yy);
      });
      return y + infoRows.length * 5.5 + 4;
    };

    // ====== Tentukan bulan-bulan yang dirender ======
    const bulanIndices: number[] = useTriwulan
      ? [(filterTriwulan - 1) * 3, (filterTriwulan - 1) * 3 + 1, (filterTriwulan - 1) * 3 + 2]
      : [monthIdx];

    // ====== Loop per bulan ======
    for (let b = 0; b < bulanIndices.length; b++) {
      const mIdx = bulanIndices[b];
      const bulanLabel = `${monthsList[mIdx]} ${filterYear}`;

      // Filter jurnal bulan ini
      const monthJournals = journals
        .filter((j) => {
          const d = parseISO(j.date);
          return getMonth(d) === mIdx && getYear(d) === filterYear;
        })
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

      // Halaman baru untuk bulan kedua dan seterusnya
      if (b > 0) {
        doc.addPage(paperDims, 'landscape');
      }

      // Gambar kop untuk bulan ini
      drawKop(marginT, bulanLabel);

      // Build body
      const body: any[] = [];
      monthJournals.forEach((j, dayIdx) => {
        const dateStr = format(parseISO(j.date), 'EEEE, d MMM yyyy', { locale: id });
        const actCount = j.activities.length;
        j.activities.forEach((act, actIdx) => {
          const row: any[] = [];
          if (actIdx === 0) {
            row.push({ content: String(dayIdx + 1), rowSpan: actCount });
            row.push({ content: dateStr, rowSpan: actCount });
          }
          row.push(act.jam || '-');
          row.push(act.jenisKegiatan || '-');
          row.push(act.agendaMapel || act.subject || '-');
          row.push(act.lokasiKelas || act.class || '-');
          row.push(act.kegiatanTujuan || [act.goal, act.activity].filter(Boolean).join(' - ') || '-');
          row.push(act.keterangan || (act.studentCount ? `${act.studentCount} Siswa` : '-'));
          body.push(row);
        });
      });

      // AutoTable
      autoTable(doc, {
        startY: startTableY,
        head: [[
          'NO', 'HARI / TANGGAL', 'JAM', 'JENIS KEGIATAN',
          'AGENDA / MAPEL', 'LOKASI / KELAS', 'KEGIATAN / TUJUAN PEMBELAJARAN', 'KETERANGAN / LAMPIRAN',
        ]],
        body,
        theme: 'grid',
        showHead: 'everyPage',
        styles: {
          font: 'times',
          fontSize: 11,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [107, 33, 168],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 11,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 24, halign: 'center' },
          6: { cellWidth: 'auto' },
          7: { cellWidth: 32 },
        },
        margin: { top: startTableY, left: marginL, right: marginR, bottom: marginB },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawKop(marginT, bulanLabel);
          }
        },
      });

      // ====== TTD untuk bulan ini ======
      const lastTableY = (doc as any).lastAutoTable.finalY + 8;
      let sigY = lastTableY;

      // Cek verifikasi
      const periodKey = `m-${mIdx}-${filterYear}`;
      const verification = guruUserId
        ? await getVerificationStatus(guruUserId, periodKey)
        : null;

      // Guru   → cek kepsekStatus
      // Kepsek → cek pengawasStatus
      const isVerified = isKepsekUser
        ? verification?.pengawasStatus === 'approved'
        : verification?.kepsekStatus === 'approved';
      const hasOfficerSig = isVerified && !!officerSig?.signatureStampImage;

      const sigBlockHeight = hasOfficerSig ? 75 : 42;

      // Kalau tidak muat di halaman ini, buat halaman baru
      if (sigY + sigBlockHeight > pageH - marginB) {
        doc.addPage(paperDims, 'landscape');
        drawKop(marginT, bulanLabel);
        sigY = startTableY;
      }

      const sigDate = getSignDate(filterYear, mIdx);
      const sigLeftX = marginL + 60;
      const sigRightX = pageW - marginR - 60;

      // Label atas
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.text('Mengetahui,', sigLeftX, sigY, { align: 'center' });
      doc.text(officerLabel, sigLeftX, sigY + 5.5, { align: 'center' });
      doc.text(`Pohuwato, ${format(sigDate, 'd MMMM yyyy', { locale: id })}`, sigRightX, sigY, { align: 'center' });
      doc.text('Guru Mata Pelajaran', sigRightX, sigY + 5.5, { align: 'center' });

      // Gambar QR/Scan (jika sudah diverifikasi)
      const labelBottom = sigY + 5.5;
      const qrTop = labelBottom + 6;
      const qrSize = 30;

      if (hasOfficerSig && officerSig?.signatureStampImage) {
        try {
          doc.addImage(
            officerSig.signatureStampImage,
            'PNG',
            sigLeftX - qrSize / 2,
            qrTop,
            qrSize,
            qrSize
          );
        } catch (e) {
          console.error('Gagal tempel QR:', e);
        }
      }

      // Posisi nama: 6mm di bawah QR (kalau ada QR), atau 25mm dari label (kalau tidak ada)
      const nameY = hasOfficerSig ? qrTop + qrSize + 6 : sigY + 25;

      doc.setFont('times', 'bold');
      doc.text(officerName, sigLeftX, nameY, { align: 'center' });
      doc.text(teacher.name || '................', sigRightX, nameY, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.text(`NIP. ${officerNip}`, sigLeftX, nameY + 5.5, { align: 'center' });
      doc.text(`NIP. ${teacher.nip || '................'}`, sigRightX, nameY + 5.5, { align: 'center' });
    }

    const monthStr = useTriwulan ? `Triwulan_${filterTriwulan}` : monthsList[monthIdx];
    const filename = `Dokumen_JURNAL_${monthStr}_${filterYear}.pdf`;
    doc.save(filename);
    addNotification('PDF Jurnal berhasil diunduh!', 'success');
  } catch (error) {
    console.error('Error PDF Jurnal:', error);
    addNotification('Gagal: ' + (error as Error).message, 'error');
  }
}

type PreviewType = 'jurnal' | 'rekomendasi' | 'sptjm' | 'pernyataan';

function PreviewSection({
  teacher,
  journals,
  approvals,
  onToggleApproval,
  addNotification,
  onUpdateTeacher,
  role = 'guru',
}: {
  teacher: TeacherData;
  journals: JournalEntry[];
  approvals: string[];
  onToggleApproval: (key: string) => void | Promise<void>;
  addNotification: (message: string, type: 'success' | 'error') => void;
  onUpdateTeacher: (data: TeacherData) => void;
  role?: 'guru' | 'kepala_sekolah' | 'pengawas';
}) {
  const [type, setType] = useState<PreviewType>('jurnal');
  const [filterMonth, setFilterMonth] = useState<number>(getMonth(new Date()));
  const [filterYear, setFilterYear] = useState<number>(getYear(new Date()));
  const [filterTriwulan, setFilterTriwulan] = useState<number>(Math.floor(getMonth(new Date()) / 3) + 1);
  const [useTriwulan, setUseTriwulan] = useState(false);
  const [showSecretMenu, setShowSecretMenu] = useState(false);
  const [letterPaperSize, setLetterPaperSize] = useState<'A4' | 'F4'>('F4');
  const [secretMonth, setSecretMonth] = useState<number>(getMonth(new Date()));
  const [secretTriwulan, setSecretTriwulan] = useState<number>(Math.floor(getMonth(new Date()) / 3) + 1);
  const [secretType, setSecretType] = useState<'m' | 'q'>('m');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const filteredJournals = journals
    .filter(j => {
      const d = parseISO(j.date);
      if (useTriwulan) {
        const q = Math.floor(getMonth(d) / 3) + 1;
        return q === filterTriwulan && getYear(d) === filterYear;
      }
      return getMonth(d) === filterMonth && getYear(d) === filterYear;
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  const generateEmailBody = () => {
    const periodText = useTriwulan
      ? `Triwulan ${filterTriwulan} (${filterYear})`
      : `${months[filterMonth]} ${filterYear}`;

    let body = `Yth. Bapak/Ibu,\n\n`;
    body += `Berikut kami kirimkan Jurnal Kegiatan Harian Guru untuk:\n\n`;
    body += `--- PROFIL GURU ---\n`;
    body += `Nama Lengkap     : ${teacher.name || '-'}\n`;
    body += `NIP              : ${teacher.nip || '-'}\n`;
    body += `Jabatan          : ${teacher.position || '-'}\n`;
    body += `Mata Pelajaran   : ${teacher.subject || '-'}\n`;
    body += `Unit Kerja       : ${teacher.workUnit || '-'}\n`;
    body += `Kecamatan        : ${teacher.kecamatan || '-'}\n`;
    body += `Pangkat/Golongan : ${teacher.grade || '-'}\n`;
    body += `NPSN             : ${teacher.npsn || '-'}\n`;
    body += `Periode Jurnal   : ${periodText}\n\n`;

    body += `--- TABEL KEGIATAN JURNAL ---\n\n`;

    if (filteredJournals.length === 0) {
      body += `Belum ada data jurnal untuk periode ini.\n`;
    } else {
      let counter = 1;
      const sortedJournals = [...filteredJournals].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

      sortedJournals.forEach(j => {
        const formattedDate = format(parseISO(j.date), 'EEEE, d MMMM yyyy', { locale: id });
        j.activities.forEach(act => {
          body += `Kegiatan #${counter}\n`;
          body += `Hari / Tanggal               : ${formattedDate}\n`;
          body += `JAM                          : ${act.jam || '-'}\n`;
          body += `Jenis Kegiatan               : ${act.jenisKegiatan || '-'}\n`;
          body += `Agenda / Mapel               : ${act.agendaMapel || act.subject || '-'}\n`;
          body += `Lokasi / Kelas               : ${act.lokasiKelas || act.class || '-'}\n`;
          body += `Kegiatan / Tujuan Pembelajaran: ${act.kegiatanTujuan || [act.goal, act.activity].filter(Boolean).join(' - ') || '-'}\n`;
          body += `Keterangan / Lampiran        : ${act.keterangan || (act.studentCount !== undefined ? `${act.studentCount} Siswa` : '-')}\n`;
          body += `--------------------------------------------------\n\n`;
          counter++;
        });
      });
    }

    body += `--- PEJABAT TERKAIT ---\n`;
    body += `Kepala Sekolah : ${teacher.principalName || '-'} (NIP. ${teacher.principalNip || '-'})\n`;
    body += `Pengawas Bina  : ${teacher.supervisorName || '-'} (NIP. ${teacher.supervisorNip || '-'})\n\n`;

    body += `Dikirim dari Aplikasi Jurnal Harian Guru.`;
    return body;
  };

  const handleKirimEmail = () => {
    if (!teacher.targetEmail || !teacher.targetEmail.trim()) {
      addNotification('Silakan isi email tujuan terlebih dahulu!', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(teacher.targetEmail.trim())) {
      addNotification('Format email tidak valid!', 'error');
      return;
    }

    const subject = `Jurnal Kegiatan Harian Guru - ${teacher.name || 'Guru'}`;
    const bodyText = generateEmailBody();

    const mailtoUrl = `mailto:${encodeURIComponent(teacher.targetEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    window.location.href = mailtoUrl;
    addNotification('Aplikasi email berhasil dibuka!', 'success');
  };

  const getEligibility = (monthIdx: number) => {
    const start = startOfMonth(new Date(filterYear, monthIdx));
    const end = endOfMonth(new Date(filterYear, monthIdx));
    const workDays = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d) && !HOLIDAYS_2026.includes(format(d, 'yyyy-MM-dd')));
    const filledDays = journals.filter(j => isWithinInterval(parseISO(j.date), { start, end }));

    const threshold = Math.max(0, workDays.length - 3);
    const isEligible = filledDays.length >= threshold;

    return {
      isEligible,
      filled: filledDays.length,
      required: threshold,
      monthName: months[monthIdx]
    };
  };

  const isMonthApproved = (m: number) => {
    const monthKey = `m-${m}-${filterYear}`;
    const q = Math.floor(m / 3) + 1;
    const triwulanKey = `q-${q}-${filterYear}`;
    return approvals.includes(monthKey) || approvals.includes(triwulanKey);
  };

  const isTriwulanApproved = (q: number) => {
    return approvals.includes(`q-${q}-${filterYear}`);
  };

  const downloadPDF = async (id: string, _filename: string, isRekomendasi = false, paperSize: 'A4' | 'F4' = 'F4') => {
    try {
      addNotification('Sedang menyiapkan PDF...', 'success');
      const element = document.getElementById(id);
      if (!element) {
        addNotification('Elemen dokumen tidak ditemukan.', 'error');
        return;
      }

      const pageElements = Array.from(
        element.querySelectorAll('.paper-a4, .paper-a4-landscape')
      ) as HTMLElement[];
      const pagesToRender = pageElements.length > 0 ? pageElements : [element];

      const docStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
      let combinedCss = '';
      for (const s of docStyles) {
        if (s.tagName.toLowerCase() === 'style') {
          combinedCss += s.textContent || '';
        } else if (s.tagName.toLowerCase() === 'link') {
          try {
            const sheet = (s as HTMLLinkElement).sheet;
            if (sheet) {
              const rules = Array.from(sheet.cssRules || []);
              combinedCss += rules.map((r) => r.cssText).join('\n');
            }
          } catch {
            // ignore cross-origin stylesheet errors
          }
        }
      }

      const safeCss = combinedCss
        .replace(/color-mix\([\s\S]*?\)/gi, '#000000')
        .replace(/oklch\([\s\S]*?\)/gi, '#000000');

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '1400px';
      iframe.style.height = '2000px';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeWin = iframe.contentWindow;
      const iframeDoc = iframeWin?.document;

      if (!iframeDoc || !iframeWin) {
        addNotification('Gagal membuat frame PDF.', 'error');
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        return;
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${safeCss}
          </style>
          <style>
            * { box-sizing: border-box; font-family: "Times New Roman", Times, serif !important; color: #000000 !important; }
                        html, body { margin: 0; padding: 0; background: #ffffff !important; }
            body { color: #000000 !important; font-family: "Times New Roman", Times, serif !important; font-size: 12pt !important; line-height: 1.5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .paper-a4, .paper-f4 {
              width: 215mm !important;
              min-height: 330mm !important;
              max-width: 215mm !important;
              padding: ${isRekomendasi ? '20mm' : '20mm 20mm 10mm 20mm'} !important;
              margin: 0 auto !important;
              background: white !important;
              box-shadow: none !important;
              position: relative !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              font-family: "Times New Roman", Times, serif !important;
              font-size: 12pt !important;
              line-height: 1.5 !important;
              color: #000000 !important;
            }
            .paper-a4-landscape, .paper-f4-landscape {
              width: 330mm !important;
              min-height: 215mm !important;
              max-width: 330mm !important;
              padding: 20mm 10mm 10mm 10mm !important;
              margin: 0 auto !important;
              background: white !important;
              box-shadow: none !important;
              position: relative !important;
              box-sizing: border-box !important;
              font-family: "Times New Roman", Times, serif !important;
              font-size: 12pt !important;
              line-height: 1.5 !important;
              color: #000000 !important;
            }
            .paper-a4-bordered, .paper-f4-bordered { border: 2px double #000000 !important; }
            p, td, th, li, span, h1, h2, h3, h4, div { color: #000000 !important; font-family: "Times New Roman", Times, serif !important; }
            p, li { line-height: 1.5 !important; font-size: 12pt !important; }
            table { border-collapse: collapse; width: 100%; border-color: #000000; }
            td, th { vertical-align: top; }
            p { margin: 0; }
            .no-print { display: none !important; }
            img { border: none !important; outline: none !important; max-width: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <div id="container"></div>
        </body>
        </html>
      `);
      iframeDoc.close();

      const container = iframeDoc.getElementById('container');
      if (!container) {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        addNotification('Gagal menyiapkan wadah PDF.', 'error');
        return;
      }

      let pdf: jsPDF | null = null;

      for (let i = 0; i < pagesToRender.length; i++) {
        const pageEl = pagesToRender[i];
        const isLandscape = pageEl.classList.contains('paper-a4-landscape') || pageEl.classList.contains('paper-f4-landscape');
        const orientation = isLandscape ? 'l' : 'p';

        const clone = pageEl.cloneNode(true) as HTMLElement;
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
        clone.style.position = 'relative';
        clone.style.background = '#ffffff';
        clone.style.backgroundColor = '#ffffff';

        const imgs = Array.from(clone.querySelectorAll('img'));
        for (const img of imgs) {
          img.setAttribute('alt', '');
          const src = img.getAttribute('src');
          if (!src || !src.trim() || src === 'null' || src === 'undefined') {
            const parent = img.parentNode;
            if (parent) {
              const div = document.createElement('div');
              div.setAttribute('style', 'width: 70px; height: 1px;');
              parent.replaceChild(div, img);
            }
          } else {
            const cleanSrc = src.trim().replace(/[\r\n]/g, '');
            if (cleanSrc.startsWith('data:')) {
              img.setAttribute('src', cleanSrc);
            } else {
              try {
                const dataUrl = await new Promise<string>((resolve) => {
                  const tempImg = new Image();
                  tempImg.crossOrigin = 'anonymous';
                  tempImg.onload = () => {
                    try {
                      const c = document.createElement('canvas');
                      c.width = tempImg.naturalWidth || 70;
                      c.height = tempImg.naturalHeight || 70;
                      const ctx = c.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(tempImg, 0, 0);
                        resolve(c.toDataURL('image/png'));
                        return;
                      }
                    } catch {
                      // ignore canvas taint
                    }
                    resolve(cleanSrc);
                  };
                  tempImg.onerror = () => resolve(cleanSrc);
                  tempImg.src = cleanSrc;
                });
                img.setAttribute('src', dataUrl);
              } catch {
                img.setAttribute('src', cleanSrc);
              }
            }
          }
        }

        container.innerHTML = '';
        container.appendChild(clone);

        await new Promise((r) => setTimeout(r, 120));

        const paperWidthPx = isLandscape ? 1247 : 813;
        const imgData = await toJpeg(clone, {
          quality: 0.95,
          pixelRatio: 3,
          backgroundColor: '#ffffff',
          cacheBust: true,
          width: paperWidthPx,
          height: clone.scrollHeight,
          style: {
            margin: '0',
            transform: 'none',
            boxShadow: 'none',
            background: '#ffffff',
            backgroundColor: '#ffffff',
            width: paperWidthPx + 'px',
          },
        });

        const paperDims = paperSize === 'A4'
          ? (isLandscape ? [297, 210] : [210, 297])
          : (isLandscape ? [330, 215] : [215, 330]);
        const formatF4 = paperDims;

        if (i === 0) {
          pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: formatF4
          });
        } else if (pdf) {
          pdf.addPage(formatF4, orientation);
        }

        if (pdf) {
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
                    const img = new Image();
          img.src = imgData;
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
          });
          const imgHeightInPdf = (img.height * pdfWidth) / img.width;

  // Kalau konten pas dalam 1 halaman → langsung render
            // Untuk JURNAL boleh multi-halaman, untuk letter tetap 1 halaman
      const allowMultiPage = type === 'jurnal';

      if (!allowMultiPage || imgHeightInPdf <= pdfHeight * 1.02) {
        // Muat dalam 1 halaman (scale agar pas)
        const renderHeight = Math.min(imgHeightInPdf, pdfHeight);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderHeight);
      } else {
        // Konten panjang → pecah otomatis ke halaman berikutnya
        let heightLeft = imgHeightInPdf;
        let position = 0;

        // Halaman pertama: taruh image penuh (bagian yang keluar halaman akan otomatis terpotong)
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;

        // Halaman berikutnya: geser gambar ke atas, tambah halaman baru
        while (heightLeft > 5) {
          position -= pdfHeight;
          pdf.addPage(formatF4, orientation);
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPdf);
          heightLeft -= pdfHeight;
        }
      }
        }
      }

      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }

      if (pdf) {
        const monthStr = useTriwulan ? `Triwulan_${filterTriwulan}` : months[filterMonth];
        const finalFilename = `Dokumen_${type.toUpperCase()}_${monthStr}_${filterYear}.pdf`;
        pdf.save(finalFilename);
        addNotification('Dokumen PDF berhasil diunduh (Ukuran F4)!', 'success');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      addNotification('Gagal mengunduh PDF. Silakan coba lagi.', 'error');
    }
  };

  const downloadWord = async () => {
    try {
      addNotification('Sedang menyiapkan file Word...', 'success');
      const previewEl = document.getElementById('preview-content');
      if (!previewEl) {
        addNotification('Elemen dokumen tidak ditemukan.', 'error');
        return;
      }

      const clone = previewEl.cloneNode(true) as HTMLElement;

      clone.querySelectorAll('.no-print').forEach(el => el.remove());

      clone.querySelectorAll('img').forEach(img => {
        img.setAttribute('alt', '');
        const src = img.getAttribute('src');
        if (!src || src.trim() === '' || src === 'null' || src === 'undefined') {
          const parent = img.parentNode;
          if (parent) {
            const div = document.createElement('div');
            div.setAttribute('style', 'width: 70px; height: 1px;');
            parent.replaceChild(div, img);
          }
        } else {
          const cleanSrc = src.trim().replace(/[\r\n]/g, '');
          img.setAttribute('src', cleanSrc);
          img.setAttribute('width', '70');
          img.setAttribute('height', '70');
          img.setAttribute('style', 'width: 70px !important; height: 70px !important; max-width: 70px; max-height: 70px; border: 0; outline: none; object-fit: contain;');
        }
      });

      const isLandscape = type === 'jurnal';
      const contentHtml = clone.innerHTML;

      const fullHtml = `
        <!DOCTYPE html>
        <html xmlns:o="urn:schemas-microsoft-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>Dokumen ${type.toUpperCase()}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForCustomXSL/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: ${isLandscape ? '13.0in 8.5in' : '8.5in 13.0in'};
              margin: 3.0cm 2.0cm 1.0cm 3.0cm;
              mso-header-margin: 0.5in;
              mso-footer-margin: 0.3in;
              mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
            }
            div.Section1 {
              page: Section1;
              margin: 3.0cm 2.0cm 1.0cm 3.0cm;
            }
            body {
              font-family: 'Times New Roman', Times, serif !important;
              font-size: 12pt !important;
              color: #000000 !important;
              line-height: 1.5 !important;
              background-color: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            h1, h2, h3, h4 {
              font-family: 'Times New Roman', Times, serif !important;
              text-align: center !important;
              margin: 4px 0 !important;
              color: #000000 !important;
            }
            p, div, span, li, td, th {
              font-family: 'Times New Roman', Times, serif !important;
              color: #000000 !important;
              font-size: 12pt !important;
              line-height: 1.5 !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            td, th {
              vertical-align: top !important;
            }
            table.w-full {
              width: 100% !important;
            }
            table.border-none, table.border-none td, table.border-none tr {
              border: none !important;
            }
            table:not(.border-none) td, table:not(.border-none) th {
              border: 1pt solid #000000 !important;
              padding: 3pt 5pt !important;
            }
            th {
              background-color: #f2f2f2 !important;
              font-weight: bold !important;
              text-align: center !important;
            }
            .paper-a4-landscape, .paper-a4-portrait, .paper-a4 {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            img {
              max-width: 100%;
              border: none !important;
            }
            ol, ul {
              margin-top: 4px;
              margin-bottom: 4px;
              padding-left: 20px;
            }
            li {
              margin-bottom: 3px;
            }
            .uppercase {
              text-transform: uppercase;
            }
            .font-bold {
              font-weight: bold;
            }
            .text-center {
              text-align: center;
            }
            .underline {
              text-decoration: underline;
            }
            .text-justify {
              text-align: justify;
            }
            .italic {
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${contentHtml}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', fullHtml], {
        type: 'application/msword;charset=utf-8'
      });

      const monthStr = useTriwulan ? `Triwulan_${filterTriwulan}` : months[filterMonth];
      const fileName = `Dokumen_${type.toUpperCase()}_${monthStr}_${filterYear}.doc`;

      saveAs(blob, fileName);
      addNotification('Dokumen Word berhasil diunduh!', 'success');
    } catch (error) {
      console.error('Error generating Word document:', error);
      addNotification('Gagal mengunduh file Word. Silakan coba lagi.', 'error');
    }
  };

  return (
    <div className="space-y-0 pt-1">
                  <Card className="p-4 no-print sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button variant={type === 'jurnal' ? 'primary' : 'outline'} onClick={() => setType('jurnal')} className="uppercase text-xs font-bold">JURNAL</Button>
            <Button variant={type === 'rekomendasi' ? 'primary' : 'outline'} onClick={() => setType('rekomendasi')} className="uppercase text-xs font-bold">REKOMENDASI</Button>
            <Button variant={type === 'pernyataan' ? 'primary' : 'outline'} onClick={() => setType('pernyataan')} className="uppercase text-xs font-bold">PERNYATAAN</Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">FILTER:</label>
              <select
                className="text-xs border border-slate-300 rounded p-1 font-semibold uppercase text-slate-800"
                value={useTriwulan ? 'q' : 'm'}
                onChange={(e) => setUseTriwulan(e.target.value === 'q')}
              >
                <option value="m">BULANAN</option>
                <option value="q">TRIWULAN</option>
              </select>

              {useTriwulan ? (
                <select
                  className="text-xs border border-slate-300 rounded p-1 font-semibold uppercase text-slate-800"
                  value={filterTriwulan}
                  onChange={(e) => setFilterTriwulan(parseInt(e.target.value))}
                >
                  <option value={1}>TRIWULAN I (JAN-MAR)</option>
                  <option value={2}>TRIWULAN II (APR-JUN)</option>
                  <option value={3}>TRIWULAN III (JUL-SEP)</option>
                  <option value={4}>TRIWULAN IV (OKT-DES)</option>
                </select>
              ) : (
                <select
                  className="text-xs border border-slate-300 rounded p-1 font-semibold uppercase text-slate-800"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                >
                  {months.map((m, i) => <option key={i} value={i}>{m.toUpperCase()}</option>)}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
                            <Button
                variant="secondary"
                onClick={() => {
                  if (type === 'jurnal') {
                    downloadJurnalPDF(
                      teacher,
                      journals,
                      filterMonth,
                      filterYear,
                      useTriwulan,
                      filterTriwulan,
                      addNotification,
                      letterPaperSize
                    );
                  } else {
                    downloadPDF(
                      'preview-content',
                      `Dokumen_${type}.pdf`,
                      type === 'rekomendasi',
                      letterPaperSize
                    );
                  }
                }}
                className="uppercase text-xs"
              >
                <Download className="w-3.5 h-3.5" /> DOWNLOAD PDF
              </Button>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setLetterPaperSize('A4')}
                    className={cn(
                      'px-2.5 py-1 text-[10px] font-bold rounded-md transition-all',
                      letterPaperSize === 'A4'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterPaperSize('F4')}
                    className={cn(
                      'px-2.5 py-1 text-[10px] font-bold rounded-md transition-all',
                      letterPaperSize === 'F4'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    F4
                  </button>
                </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Secret Menu (Disguised) */}
      <div className="flex flex-col items-center gap-2 no-print">
        <button
          onClick={() => setShowSecretMenu(!showSecretMenu)}
          className="text-[8px] text-slate-200 hover:text-indigo-200 transition-colors"
          title="Supervisor Approval Toggle"
        >
          .
        </button>

        {showSecretMenu && (
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Input Persetujuan:</span>
            <select
              className="text-xs border rounded p-1"
              value={secretType}
              onChange={(e) => setSecretType(e.target.value as 'm' | 'q')}
            >
              <option value="m">Bulan</option>
              <option value="q">Triwulan</option>
            </select>

            {secretType === 'm' ? (
              <select
                className="text-xs border rounded p-1"
                value={secretMonth}
                onChange={(e) => setSecretMonth(parseInt(e.target.value))}
              >
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            ) : (
              <select
                className="text-xs border rounded p-1"
                value={secretTriwulan}
                onChange={(e) => setSecretTriwulan(parseInt(e.target.value))}
              >
                <option value={1}>T-1 (Jan-Mar)</option>
                <option value={2}>T-2 (Apr-Jun)</option>
                <option value={3}>T-3 (Jul-Sep)</option>
                <option value={4}>T-4 (Okt-Des)</option>
              </select>
            )}

            <Button
              variant="secondary"
              className="py-1 px-3 text-[10px]"
              onClick={() => {
                const key = secretType === 'm'
                  ? `m-${secretMonth}-${filterYear}`
                  : `q-${secretTriwulan}-${filterYear}`;
                onToggleApproval(key);
              }}
            >
              {approvals.includes(secretType === 'm' ? `m-${secretMonth}-${filterYear}` : `q-${secretTriwulan}-${filterYear}`)
                ? 'Batalkan Setuju'
                : 'Setujui'}
            </Button>
          </div>
        )}
      </div>
      <div id="preview-content" className="flex flex-col items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white overflow-y-auto">
        {type === 'jurnal' && (
          <>
            {useTriwulan ? (
              [0, 1, 2].map(offset => {
                const mIdx = (filterTriwulan - 1) * 3 + offset;
                const monthJournals = journals.filter(j => {
                  const d = parseISO(j.date);
                  return getMonth(d) === mIdx && getYear(d) === filterYear;
                });
                return (
                  <div key={mIdx}>
                    <JurnalTable
                      teacher={teacher}
                      journals={monthJournals}
                      month={months[mIdx]}
                      year={filterYear}
                      monthIndex={mIdx}
                      role={role}
                    />
                  </div>
                );
              })
            ) : (
              <JurnalTable
                teacher={teacher}
                journals={filteredJournals}
                month={months[filterMonth]}
                year={filterYear}
                monthIndex={filterMonth}
                role={role}
              />
            )}
          </>
        )}
        {type === 'rekomendasi' && (
          <RekomendasiLetter
            teacher={teacher}
            triwulan={filterTriwulan}
            year={filterYear}
            getEligibility={getEligibility}
            checkApproval={isMonthApproved}
            useTriwulan={useTriwulan}
            filterMonth={filterMonth}
          />
        )}
        {type === 'pernyataan' && (
          <PernyataanLetter
            teacher={teacher}
            year={filterYear}
            useTriwulan={useTriwulan}
            filterMonth={filterMonth}
            filterTriwulan={filterTriwulan}
          />
        )}
      </div>
    </div>
  );
}

// --- Letter Templates ---

const getFormattedAddress = (addr?: string) => {
  if (!addr || !addr.trim()) return 'Alamat: Jalan Ki Hajar Dewantara No. 8 Palopo Kecamatan Marisa';
  const trimmed = addr.trim();
  if (/^alamat\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Alamat: ${trimmed}`;
};

const KopSurat = ({
  teacher,
  compact = false,
}: {
  teacher?: TeacherData;
  compact?: boolean;
}) => (
  <div style={{ width: '100%', marginBottom: '12px', background: '#ffffff', color: '#000000' }}>
    <table
      width="100%"
      border={0}
      cellPadding={0}
      cellSpacing={0}
      style={{ width: '100%', borderCollapse: 'collapse', border: 'none', background: '#ffffff' }}
    >
      <tbody>
        <tr>
          <td
            width="80"
            style={{
              width: '80px',
              border: 'none',
              verticalAlign: 'middle',
              textAlign: 'left',
              background: '#ffffff',
              padding: 0,
            }}
          >
            {teacher?.districtLogo && teacher.districtLogo.trim() !== '' ? (
              <img
                src={teacher.districtLogo.trim()}
                alt=""
                style={{
                  width: '75px',
                  height: '75px',
                  objectFit: 'contain',
                  border: 'none',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{ width: '75px', height: '75px' }}></div>
            )}
          </td>
          <td
            style={{
              border: 'none',
              verticalAlign: 'middle',
              textAlign: 'center',
              padding: '0 8px',
              background: '#ffffff',
            }}
          >
            <p
              style={{
                margin: 0,
                padding: 0,
                fontWeight: 'bold',
                fontSize: '13pt',
                textAlign: 'center',
                fontFamily: '"Times New Roman", Times, serif',
                textTransform: 'uppercase',
                lineHeight: '1.2',
                color: '#000000',
              }}
            >
              PEMERINTAH KABUPATEN POHUWATO
            </p>
            <p
              style={{
                margin: 0,
                padding: 0,
                fontWeight: 'bold',
                fontSize: '13pt',
                textAlign: 'center',
                fontFamily: '"Times New Roman", Times, serif',
                textTransform: 'uppercase',
                lineHeight: '1.2',
                color: '#000000',
              }}
            >
              {teacher?.institution
                ? teacher.institution.toUpperCase()
                : 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
            </p>
                        {!compact && (
              <p
                style={{
                  margin: 0,
                  padding: 0,
                  fontWeight: 'bold',
                  fontSize: '15pt',
                  textAlign: 'center',
                  fontFamily: '"Times New Roman", Times, serif',
                  textTransform: 'uppercase',
                  lineHeight: '1.2',
                  letterSpacing: '0.5px',
                  color: '#000000',
                }}
              >
                {teacher?.workUnit ? teacher.workUnit.toUpperCase() : 'SMP NEGERI RANDANGAN'}
              </p>
            )}
            <p
              style={{
                margin: 0,
                padding: 0,
                fontStyle: 'italic',
                fontSize: '8pt',
                textAlign: 'center',
                fontFamily: '"Times New Roman", Times, serif',
                lineHeight: '1.2',
                color: '#000000',
              }}
            >
              {getFormattedAddress(
                compact ? teacher?.institutionAddress : teacher?.schoolAddress
              )}
            </p>
          </td>
          <td
            width="80"
            style={{
              width: '80px',
              border: 'none',
              verticalAlign: 'middle',
              textAlign: 'right',
              background: '#ffffff',
              padding: 0,
            }}
          >
            {!compact && teacher?.schoolLogo && teacher.schoolLogo.trim() !== '' ? (
              <img
                src={teacher.schoolLogo.trim()}
                alt=""
                style={{
                  width: '75px',
                  height: '75px',
                  objectFit: 'contain',
                  border: 'none',
                  display: 'block',
                  marginLeft: 'auto',
                }}
              />
            ) : (
              <div style={{ width: '75px', height: '75px' }}></div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
    <div
      style={{
        borderTop: '3px double #000000',
        marginTop: '6px',
        marginBottom: '10px',
        background: '#ffffff',
        height: 0,
      }}
    ></div>
  </div>
);

function JurnalTable({ teacher, journals, month, year, monthIndex, role = 'guru' }: {
  teacher: TeacherData;
  journals: JournalEntry[];
  month: string;
  year: number;
  monthIndex: number;
  role?: 'guru' | 'kepala_sekolah' | 'pengawas';
}) {
  const lastDay = endOfMonth(new Date(year, monthIndex));
  const sortedJournals = [...journals].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  const tdStyle: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '6px 8px',
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '10.5pt',
    lineHeight: '1.3',
    color: '#000000',
    background: '#ffffff',
    verticalAlign: 'top',
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '6px 8px',
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '10.5pt',
    lineHeight: '1.3',
    color: '#000000',
    background: '#e5e5e5',
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    verticalAlign: 'middle',
  };

  const dataLabelStyle: React.CSSProperties = {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '12pt',
    color: '#000000',
    padding: '1px 0',
    verticalAlign: 'top',
    border: 'none',
    background: '#ffffff',
  };

  return (
    <div
      className="paper-a4-landscape"
      style={{ background: '#ffffff', color: '#000000' }}
    >
      <KopSurat teacher={teacher} />
      <h3
        style={{
          textAlign: 'center',
          fontWeight: 'bold',
          marginBottom: '16px',
          marginTop: '8px',
          fontSize: '13pt',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#000000',
        }}
      >
                {role === 'kepala_sekolah' ? 'JURNAL KEGIATAN HARIAN KEPALA SATUAN PENDIDIKAN' : 'JURNAL KEGIATAN HARIAN GURU'}
      </h3>

            <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: 'none',
          marginBottom: '16px',
          background: '#ffffff',
        }}
      >
        <tbody>
          <tr style={{ border: 'none' }}>
            <td style={{ width: '50%', ...dataLabelStyle, paddingRight: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '110px', ...dataLabelStyle }}>Nama</td>
                    <td style={{ width: '12px', ...dataLabelStyle, textAlign: 'center' }}>:</td>
                    <td style={dataLabelStyle}>{teacher.name}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '110px', ...dataLabelStyle }}>NIP</td>
                    <td style={{ width: '12px', ...dataLabelStyle, textAlign: 'center' }}>:</td>
                    <td style={dataLabelStyle}>{teacher.nip}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '110px', ...dataLabelStyle }}>Jabatan</td>
                    <td style={{ width: '12px', ...dataLabelStyle, textAlign: 'center' }}>:</td>
                    <td style={dataLabelStyle}>{teacher.position}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ width: '50%', ...dataLabelStyle, paddingLeft: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '110px', ...dataLabelStyle }}>Unit Kerja</td>
                    <td style={{ width: '12px', ...dataLabelStyle, textAlign: 'center' }}>:</td>
                    <td style={dataLabelStyle}>{teacher.workUnit}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '110px', ...dataLabelStyle }}>Kecamatan</td>
                    <td style={{ width: '12px', ...dataLabelStyle, textAlign: 'center' }}>:</td>
                    <td style={dataLabelStyle}>{teacher.kecamatan}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '110px', ...dataLabelStyle }}>Bulan</td>
                    <td style={{ width: '12px', ...dataLabelStyle, textAlign: 'center' }}>:</td>
                    <td style={dataLabelStyle}>{`${month} ${year}`}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          background: '#ffffff',
        }}
      >
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '28px' }}>NO</th>
            <th style={{ ...thStyle, width: '90px' }}>HARI / TANGGAL</th>
            <th style={{ ...thStyle, width: '70px' }}>JAM</th>
            <th style={{ ...thStyle, width: '100px' }}>JENIS KEGIATAN</th>
            <th style={{ ...thStyle, width: '100px' }}>AGENDA / MAPEL</th>
            <th style={{ ...thStyle, width: '80px' }}>LOKASI / KELAS</th>
            <th style={thStyle}>KEGIATAN / TUJUAN PEMBELAJARAN</th>
            <th style={{ ...thStyle, width: '100px' }}>KETERANGAN / LAMPIRAN</th>
          </tr>
        </thead>
        <tbody>
          {sortedJournals.map((j, i) => (
            <React.Fragment key={j.id}>
              {j.activities.map((act, actIdx) => (
                <tr key={`${j.id}-${actIdx}`}>
                  {actIdx === 0 && (
                    <td
                      style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'top' }}
                      rowSpan={j.activities.length}
                    >
                      {i + 1}
                    </td>
                  )}
                  {actIdx === 0 && (
                    <td style={tdStyle} rowSpan={j.activities.length}>
                      {format(parseISO(j.date), 'EEEE, d MMM yyyy', { locale: id })}
                    </td>
                  )}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{act.jam || '-'}</td>
                  <td style={tdStyle}>{act.jenisKegiatan || '-'}</td>
                  <td style={tdStyle}>{act.agendaMapel || act.subject || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {act.lokasiKelas || act.class || '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'justify' }}>
                    {act.kegiatanTujuan || [act.goal, act.activity].filter(Boolean).join(' - ') || '-'}
                  </td>
                  <td style={tdStyle}>
                    {act.keterangan ||
                      (act.studentCount !== undefined ? `${act.studentCount} Siswa` : '-')}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          {journals.length === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{
                  ...tdStyle,
                  padding: '32px',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  color: '#666666',
                }}
              >
                Belum ada data jurnal untuk periode ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>

            <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: 'none',
          marginTop: '32px',
          background: '#ffffff',
        }}
      >
        <tbody>
          <tr style={{ border: 'none' }}>
            <td
              style={{
                width: '50%',
                border: 'none',
                textAlign: 'center',
                verticalAlign: 'top',
                padding: '0 8px',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12pt',
                color: '#000000',
                background: '#ffffff',
                lineHeight: '1.3',
              }}
            >
              <p style={{ margin: 0 }}>Mengetahui,</p>
              <p style={{ margin: 0 }}>
                {role === 'kepala_sekolah' ? 'Pengawas Bina' : 'Kepala Satuan Pendidikan'}
              </p>
            </td>
            <td
              style={{
                width: '50%',
                border: 'none',
                textAlign: 'center',
                verticalAlign: 'top',
                padding: '0 8px',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12pt',
                color: '#000000',
                background: '#ffffff',
                lineHeight: '1.3',
              }}
            >
              <p style={{ margin: 0 }}>
                Pohuwato, {format(lastDay, 'd MMMM yyyy', { locale: id })}
              </p>
              <p style={{ margin: 0 }}>Guru Mata Pelajaran</p>
            </td>
          </tr>
          <tr style={{ border: 'none' }}>
            <td style={{ height: '70px', border: 'none' }}></td>
            <td style={{ height: '70px', border: 'none' }}></td>
          </tr>
          <tr style={{ border: 'none' }}>
            <td
              style={{
                width: '50%',
                border: 'none',
                textAlign: 'center',
                verticalAlign: 'bottom',
                padding: '0 8px',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12pt',
                color: '#000000',
                background: '#ffffff',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  fontWeight: 'bold',
                  lineHeight: '1.2',
                }}
              >
                {teacher.principalName || '......................................................'}
              </span>
              <p style={{ margin: 0, marginTop: '4px', lineHeight: '1.2' }}>
                NIP. {teacher.principalNip || '................................................'}
              </p>
            </td>
            <td
              style={{
                width: '50%',
                border: 'none',
                textAlign: 'center',
                verticalAlign: 'bottom',
                padding: '0 8px',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12pt',
                color: '#000000',
                background: '#ffffff',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  fontWeight: 'bold',
                  lineHeight: '1.2',
                }}
              >
                {teacher.name || '......................................................'}
              </span>
              <p style={{ margin: 0, marginTop: '2px', lineHeight: '1.15' }}>
                NIP. {teacher.nip || '................................................'}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RekomendasiLetter({
  teacher,
  triwulan,
  year,
  getEligibility,
  checkApproval,
  useTriwulan,
  filterMonth
}: {
  teacher: TeacherData;
  triwulan: number;
  year: number;
  getEligibility: (m: number) => { isEligible: boolean; filled: number; required: number; monthName: string };
  checkApproval: (m: number) => boolean;
  useTriwulan: boolean;
  filterMonth: number;
}) {
  const startMonth = (triwulan - 1) * 3;
  const monthIndices = useTriwulan ? [startMonth, startMonth + 1, startMonth + 2] : [filterMonth];
  const statuses = monthIndices.map(i => ({
    ...getEligibility(i),
    manualApproved: checkApproval(i),
    index: i
  }));

  const displayDate = useTriwulan
    ? endOfMonth(new Date(year, startMonth + 2))
    : endOfMonth(new Date(year, filterMonth));

  const isAllEligible = statuses.every(s => s.isEligible || s.manualApproved);
  return (
    <div
      className="paper-a4 paper-a4-bordered font-tnr text-[12pt] leading-[1.5] text-black"
      style={{ padding: '20mm' }}
    >
      <KopSurat teacher={teacher} compact />
      <h3 className="text-center font-bold mb-3 text-[13pt] uppercase tracking-wide text-black">REKOMENDASI PENGAWAS</h3>

      <div className="text-[12pt] space-y-2 font-tnr leading-[1.5] text-black">
        <p>Yang bertanda tangan di bawah ini:</p>
        <div className="ml-5 space-y-0.5">
          <DataRow label="Nama" value={teacher.supervisorName} colonPos="110px" />
          <DataRow label="NIP" value={teacher.supervisorNip} colonPos="110px" />
          <DataRow label="Jabatan" value="Pengawas Bina" colonPos="110px" />
        </div>
        <p>Menerangkan kepada:</p>
        <div className="ml-5 space-y-0.5">
          <DataRow label="1. Nama" value={teacher.name} colonPos="110px" />
          <DataRow label="2. NIP" value={teacher.nip} colonPos="110px" />
          <DataRow label="3. Jabatan" value={teacher.position} colonPos="110px" />
          <DataRow label="4. Unit Kerja" value={teacher.workUnit} colonPos="110px" />
        </div>
        <p className="text-justify pt-1 leading-[1.5]">
          {isAllEligible ? (
            "Bahwa yang bersangkutan benar-benar melaksanakan tugas mengajar minimal 24 jam dan linieritas pada satuan pendidikan. Berdasarkan data pengisian jurnal kegiatan harian yang telah dilaksanakan guru serta bukti kehadiran daftar hadir yang telah dilaksanakan dengan baik maka yang bersangkutan:"
          ) : (
            "Bahwa yang bersangkutan benar-benar guru dengan tugas mengajar minimal 24 jam dan linieritas pada satuan pendidikan. Berdasarkan data pengisian jurnal kegiatan harian yang belum dilaksanakan dengan baik serta bukti kehadiran berupa daftar hadir yang tidak dilaksanakan dengan baik maka yang bersangkutan:"
          )}
        </p>
        <div className="ml-5 space-y-1">
          {statuses.map((s, i) => {
            const approved = s.isEligible || s.manualApproved;
            const statusText = approved
              ? `BERHAK MENERIMA TPG/TPP BULAN ${s.monthName.toUpperCase()} TAHUN ${year}`
              : `BELUM BERHAK MENERIMA TPG/TPP BULAN ${s.monthName.toUpperCase()} TAHUN ${year}`;

            const subText = (!s.isEligible && s.manualApproved) ? " (DISETUJUI OLEH PENGAWAS)" : "";

            return (
              <p key={i} className={cn("font-bold leading-[1.5]", approved ? "text-black" : "text-red-600")}>
                {i + 1}. {statusText}{subText}
              </p>
            );
          })}
        </div>
        <p className="text-justify pt-1 leading-[1.5]">
          Demikian rekomendasi ini dibuat untuk melengkapi berkas penerimaan TPG/TPP.
        </p>
      </div>

      <table className="w-full border-none mt-5 text-[12pt] font-tnr leading-[1.5] text-black" style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
        <tbody>
          <tr style={{ border: 'none' }}>
            <td style={{ width: '50%', border: 'none' }}></td>
            <td style={{ width: '50%', border: 'none', textAlign: 'center', verticalAlign: 'top', color: '#000000' }}>
              <p style={{ margin: 0 }}>Pohuwato, {format(displayDate, 'd MMMM yyyy', { locale: id })}</p>
              <p style={{ margin: 0 }}>Pengawas Bina,</p>
              <div style={{ height: '48px' }}></div>
              <p style={{ margin: 0, fontWeight: 'bold', }}>{teacher.supervisorName}</p>
              <p style={{ margin: 0 }}>NIP. {teacher.supervisorNip}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SPTJMLetter({
  teacher,
  triwulan,
  year,
  useTriwulan,
  filterMonth
}: {
  teacher: TeacherData;
  triwulan: number;
  year: number;
  useTriwulan: boolean;
  filterMonth: number;
}) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const startMonth = (triwulan - 1) * 3;

  const displayMonths = useTriwulan
    ? [months[startMonth], months[startMonth + 1], months[startMonth + 2]].join(', ')
    : months[filterMonth];

  const displayDate = useTriwulan
    ? endOfMonth(new Date(year, startMonth + 2))
    : endOfMonth(new Date(year, filterMonth));

  return (
    <div
      className="paper-a4 paper-a4-bordered font-tnr text-[12pt] leading-[1.5] text-black"
      style={{ padding: '20mm 20mm 10mm 20mm' }}
    >
      <KopSurat teacher={teacher} />
      <div className="text-center mb-2.5">
        <h1 className="text-[13pt] font-bold uppercase tracking-wide text-black">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</h1>
        <h2 className="text-[12pt] font-bold uppercase tracking-wide text-black">KEBENARAN DATA GURU PADA DAPODIK</h2>
      </div>

      <div className="text-[12pt] space-y-1.5 font-tnr leading-[1.5] text-black">
        <p>Yang bertanda tangan di bawah ini :</p>
        <div className="ml-5 space-y-0.5">
          <DataRow label="Nama" value={teacher.principalName || '......................................................'} colonPos="190px" />
          <DataRow label="NIP" value={teacher.principalNip || '......................................................'} colonPos="190px" />
          <DataRow label="Jabatan" value="Kepala Satuan Pendidikan" colonPos="190px" />
          <DataRow label="Nama Satuan Pendidikan" value={teacher.workUnit || 'SMP Negeri 1 Randangan'} colonPos="190px" />
          <DataRow label="NPSN" value={teacher.npsn || '......................................................'} colonPos="190px" />
          <DataRow label="Alamat Unit Kerja" value={teacher.schoolAddress || '......................................................'} colonPos="190px" />
        </div>

        <p className="pt-0.5">Dengan ini menyatakan dengan sesungguhnya bahwa:</p>
        <ol className="list-decimal ml-5 space-y-1 text-justify leading-[1.5]">
          <li>
            Data guru yang diusulkan dan dikirimkan melalui aplikasi Data Pokok Pendidikan (Dapodik) pada bulan {displayMonths} tahun {year} telah mencerminkan kondisi keaktifan guru yang sebenarnya di satuan pendidikan, meliputi:
            <ol className="list-[lower-alpha] ml-5 mt-0.5 space-y-0.5">
              <li>kehadiran,</li>
              <li>penugasan,</li>
              <li>pemenuhan jam mengajar sesuai ketentuan, dan</li>
              <li>status aktif melaksanakan tugas.</li>
            </ol>
          </li>
          <li>
            Data pangkat/golongan dan masa kerja guru yang tercantum dalam Dapodik telah disesuaikan dan disinkronkan dengan data pada aplikasi MyASN, berdasarkan dokumen dan informasi kepegawaian yang sah.
          </li>
          <li>
            Kelengkapan dan kebenaran data kepegawaian guru, khususnya yang berkaitan dengan riwayat pangkat/golongan dan riwayat masa kerja berkala, telah diverifikasi oleh satuan pendidikan dan bersumber dari data yang disampaikan oleh guru yang bersangkutan sebagai pemilik data.
          </li>
          <li>
            Saya bertanggung jawab penuh atas kebenaran seluruh data guru yang diusulkan dalam Dapodik sebagaimana dimaksud dalam pernyataan ini.
          </li>
          <li>
            Apabila di kemudian hari ditemukan ketidaksesuaian data keaktifan guru pada Dapodik dengan kondisi nyata dilapangan (guru tidak aktif, tidak melaksanakan tugas, atau tidak memenuhi kewajiban mengajar) yang mengakibatkan pembayaran Tunjangan Profesi Guru, Tambahan Penghasilan, dan/atau Tunjangan Khusus Guru yang tidak semestinya, maka saya bersedia bertanggung jawab sepenuhnya atas kerugian yang ditimbulkan, sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.
          </li>
        </ol>

        <p className="text-justify leading-[1.5] pt-0.5">
          Demikian Surat Pernyataan Tanggung Jawab Mutlak ini saya buat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
        </p>
      </div>

      <table className="w-full border-none mt-4 text-[12pt] font-tnr leading-[1.5] text-black" style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
        <tbody>
          <tr style={{ border: 'none' }}>
            <td style={{ width: '50%', border: 'none' }}></td>
            <td style={{ width: '50%', border: 'none', textAlign: 'center', verticalAlign: 'top', color: '#000000' }}>
              <p style={{ margin: 0 }}>Pohuwato, {format(displayDate, 'd MMMM yyyy', { locale: id })}</p>
              <p style={{ margin: 0 }}>Yang Membuat Pernyataan,</p>
              <div style={{ border: '1px solid #999', width: '90px', height: '36px', margin: '4px auto', textAlign: 'center', lineHeight: '36px', fontSize: '8pt', color: '#333', borderRadius: '3px' }}>
                Meterai 10.000
              </div>
              <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{teacher.principalName || '......................................................'}</p>
              <p style={{ margin: 0 }}>NIP. {teacher.principalNip || '......................................................'}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PernyataanLetter({
  teacher,
  year,
  useTriwulan,
  filterMonth,
  filterTriwulan,
}: {
  teacher: TeacherData;
  year: number;
  useTriwulan: boolean;
  filterMonth: number;
  filterTriwulan: number;
}) {
  const romanNumerals = ['I', 'II', 'III', 'IV'];
  const terbilang = ['Satu', 'Dua', 'Tiga', 'Empat'];
  const monthsList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Text periode: kalau triwulan → "Triwulan III (Tiga) Tahun 2026"
  //                kalau bulanan → "Agustus 2026"
  const periodText = useTriwulan
    ? `Triwulan ${romanNumerals[filterTriwulan - 1]} (${terbilang[filterTriwulan - 1]}) Tahun ${year}`
    : `Bulan ${monthsList[filterMonth]} ${year}`;

  // Untuk tanggal TTD: tetap hitung triwulan dari bulan kalau mode bulanan
  const triwulanIdx = useTriwulan ? filterTriwulan : Math.floor(filterMonth / 3) + 1;

  // Tanggal otomatis di akhir periode
  const startMonth = (triwulanIdx - 1) * 3;
  const displayDate = useTriwulan
    ? endOfMonth(new Date(year, startMonth + 2))
    : endOfMonth(new Date(year, filterMonth));

  // Kota untuk tanggal surat (dari kecamatan, hilangkan prefix "Kecamatan ")
  const city = (teacher.kecamatan || 'Randangan').replace(/^Kecamatan\s+/i, '');

  return (
    <div
      className="paper-a4 paper-a4-bordered font-tnr text-[12pt] leading-[1.5] text-black"
      style={{ padding: '20mm 20mm 10mm 20mm' }}
    >
      <div className="text-center mb-6">
        <h3 className="font-bold text-[13pt] uppercase tracking-wide text-black">
          SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK
        </h3>
      </div>

      <div className="text-[12pt] space-y-2 font-tnr leading-[1.5] text-black">
        <p>Yang bertanda tangan di bawah ini:</p>
        <div className="ml-5 space-y-0.5">
          <DataRow label="Nama" value={teacher.name || '..............................'} colonPos="160px" />
          <DataRow label="NIP" value={teacher.nip || '..............................'} colonPos="160px" />
          <DataRow label="Pangkat/Golongan" value={teacher.grade || '..............................'} colonPos="160px" />
          <DataRow label="Jabatan" value={teacher.position || '..............................'} colonPos="160px" />
          <DataRow label="Unit Kerja" value={teacher.workUnit || '..............................'} colonPos="160px" />
        </div>

        <p className="text-justify pt-3 leading-[1.5]">
          Bahwa Saya sebagai penerima Tunjangan Profesi Guru <strong>{periodText}</strong> dengan ini menyatakan:
        </p>

        <ol className="list-decimal ml-5 space-y-2 text-justify leading-[1.5]">
          <li>
            Bertanggungjawab sepenuhnya terhadap ketentuan yang ada dalam Peraturan Menteri Pendidikan dan Kebudayaan Republik Indonesia Nomor 19 Tahun 2021 tentang Petunjuk Teknis Penyaluran Tunjangan Profesi, Tunjangan Khusus dan Tambahan Penghasilan Guru Pegawai Negeri Sipil Daerah dan Peraturan Menteri Pendidikan Kebudayaan, Riset dan Teknologi Republik Indonesia Nomor 4 Tahun 2022 Tentang Petunjuk Teknis Pemberian Tunjangan Profesi, Tunjangan Khusus dan Tambahan Penghasilan Guru Aparatur Sipil Negara di Daerah Provinsi, Kabupaten/Kota.
          </li>
          <li>
            Melaksanakan tugas beban kerja guru selama 24 jam yang diampu dan linearitas dengan kualifikasi pendidikan yang dimiliki.
          </li>
          <li>
            Jika dikemudian hari pembayaran tunjangan profesi/tambahan penghasilan yang saya terima tidak sesuai dengan petunjuk teknis dan peraturan Perundang-undangan yang berlaku dan mengakibatkan kerugian negara, saya bersedia mengembalikan kerugian tersebut secara utuh (tidak mencicil).
          </li>
        </ol>

        <p className="text-justify leading-[1.5] pt-3">
          Demikian surat pernyataan tanggung jawab mutlak ini saya buat dengan tanpa ada paksaan pihak manapun.
        </p>
      </div>

      <table
        className="w-full border-none mt-8 text-[12pt] font-tnr leading-[1.5] text-black"
        style={{ width: '100%', borderCollapse: 'collapse', border: 'none', tableLayout: 'fixed' }}
      >
        <tbody>
          <tr style={{ border: 'none' }}>
            <td style={{ width: '50%', border: 'none', textAlign: 'center', verticalAlign: 'top', padding: '0 8px', color: '#000000' }}>
              <p style={{ margin: 0 }}>Mengetahui,</p>
              <p style={{ margin: 0 }}>Kepala Sekolah</p>
            </td>
            <td style={{ width: '50%', border: 'none', textAlign: 'center', verticalAlign: 'top', padding: '0 8px', color: '#000000' }}>
              <p style={{ margin: 0 }}>{city}, {format(displayDate, 'd MMMM yyyy', { locale: id })}</p>
              <p style={{ margin: 0 }}>Yang Membuat Pernyataan</p>
            </td>
          </tr>
          <tr style={{ border: 'none' }}>
            <td style={{ height: '70px', border: 'none' }}></td>
            <td style={{ height: '70px', border: 'none' }}></td>
          </tr>
          <tr style={{ border: 'none' }}>
            <td style={{ width: '50%', border: 'none', textAlign: 'center', verticalAlign: 'bottom', padding: '0 8px', color: '#000000' }}>
              <p style={{ margin: 0, fontWeight: 'bold', }}>
                {teacher.principalName || '......................................................'}
              </p>
              <p style={{ margin: 0 }}>NIP. {teacher.principalNip || '................................................'}</p>
            </td>
            <td style={{ width: '50%', border: 'none', textAlign: 'center', verticalAlign: 'bottom', padding: '0 8px', color: '#000000' }}>
              <p style={{ margin: 0, fontWeight: 'bold', }}>
                {teacher.name || '......................................................'}
              </p>
              <p style={{ margin: 0 }}>NIP. {teacher.nip || '................................................'}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


