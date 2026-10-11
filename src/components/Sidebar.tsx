import type { ReactNode } from 'react';
import {
  LayoutDashboard, User, FileText, Eye, History,
  Users, ClipboardCheck, CheckSquare, FileCheck, LogOut, BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import type { TeacherData, UserProfile, TabKey } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  teacher: TeacherData;
  profile: UserProfile | null;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  key: TabKey;
  label: string;
  icon: ReactNode;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const guruSections: MenuSection[] = [
  {
    title: 'UTAMA',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { key: 'profile', label: 'Profil Guru', icon: <User className="w-5 h-5" /> },
      { key: 'journal', label: 'Input Jurnal', icon: <FileText className="w-5 h-5" /> },
    ],
  },
  {
    title: 'DOKUMEN',
    items: [
      { key: 'preview', label: 'Preview & Cetak', icon: <Eye className="w-5 h-5" /> },
    ],
  },
];

const kepsekSections: MenuSection[] = [
  {
    title: 'UTAMA',
    items: [
      { key: 'ks_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { key: 'profile', label: 'Profil Kepala Sekolah', icon: <User className="w-5 h-5" /> },
      { key: 'ks_journal', label: 'Input Jurnal', icon: <FileText className="w-5 h-5" /> },
    ],
  },
  {
    title: 'VERIFIKASI',
    items: [
      { key: 'ks_queue', label: 'Verifikasi Jurnal', icon: <ClipboardCheck className="w-5 h-5" /> },
      { key: 'ks_teachers', label: 'Semua Guru', icon: <Users className="w-5 h-5" /> },
      { key: 'ks_history', label: 'Riwayat Verifikasi', icon: <History className="w-5 h-5" /> },
    ],
  },
  {
    title: 'DOKUMEN',
    items: [
      { key: 'ks_preview', label: 'Preview & Cetak', icon: <Eye className="w-5 h-5" /> },
      { key: 'ks_sptjm', label: 'SPTJM Sekolah', icon: <FileSpreadsheet className="w-5 h-5" /> },
    ],
  },
];

const pengawasSections: MenuSection[] = [
  {
    title: 'UTAMA',
    items: [
      { key: 'pw_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { key: 'profile', label: 'Profil Pengawas', icon: <User className="w-5 h-5" /> },
    ],
  },
  {
    title: 'REKOMENDASI',
    items: [
      { key: 'pw_teachers', label: 'Daftar Guru Binaan', icon: <Users className="w-5 h-5" /> },
      { key: 'pw_approve', label: 'Verifikasi Rekomendasi', icon: <CheckSquare className="w-5 h-5" /> },
    ],
  },
  {
    title: 'DOKUMEN',
    items: [
      { key: 'pw_rec_history', label: 'Riwayat Rekomendasi', icon: <FileCheck className="w-5 h-5" /> },
    ],
  },
];

export function Sidebar({
  activeTab,
  onTabChange,
  teacher,
  profile,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const role = profile?.role || 'guru';
  const sections = role === 'pengawas'
    ? pengawasSections
    : role === 'kepala_sekolah'
    ? kepsekSections
    : guruSections;
  const roleLabel = role === 'pengawas'
    ? 'Pengawas Sekolah'
    : role === 'kepala_sekolah'
    ? 'Kepala Sekolah'
    : 'Guru';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'w-64 bg-[var(--color-sidebar-bg)] text-white flex flex-col shrink-0 no-print',
          'lg:rounded-xl lg:overflow-hidden',
          'fixed lg:relative inset-y-0 left-0 z-50 transition-transform duration-300 lg:transition-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {teacher.schoolLogo || teacher.districtLogo ? (
              <img
                src={teacher.schoolLogo || teacher.districtLogo}
                alt="Logo"
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <BookOpen className="w-5 h-5 text-[var(--color-sidebar-bg)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-sm tracking-wide uppercase leading-tight">JURNAL</p>
            <p className="text-[11px] text-[var(--color-sidebar-text)] truncate leading-tight">
              {roleLabel}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {sections.map((section) => (
            <div key={section.title} className="mb-1">
              <p className="px-5 pt-3 pb-1.5 text-[10px] font-bold text-[var(--color-sidebar-text)] uppercase tracking-wider">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onTabChange(item.key);
                      onCloseMobile();
                    }}
                    className={cn(
                      'flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all text-left',
                      'w-[calc(100%-16px)]',
                      isActive
                        ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-text-active)] shadow-sm'
                        : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {teacher.profilePhoto ? (
                <img src={teacher.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white/60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {teacher.name || 'Belum Terdaftar'}
              </p>
              <p className="text-[10px] text-[var(--color-sidebar-text)] truncate leading-tight">
                {teacher.nip || '-'}
              </p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}