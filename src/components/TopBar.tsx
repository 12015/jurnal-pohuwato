import { Menu, User } from 'lucide-react';

interface TopBarProps {
  title: string;
  teacherName: string;
  teacherNip: string;
  teacherPhoto?: string;
  onToggleSidebar: () => void;
}

export function TopBar({
  title,
  teacherName,
  teacherNip,
  teacherPhoto,
  onToggleSidebar,
}: TopBarProps) {
  return (
    <header className="no-print bg-white px-4 sm:px-6 pb-3">
      <div className="flex items-stretch gap-3">
        {/* Kartu 1: Judul Halaman (BIRU) */}
        <div className="flex-1 min-w-0 bg-[var(--color-brand-800)] text-white rounded-lg px-4 py-2.5 flex items-center gap-3 shadow-sm">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="w-6 h-6 rounded bg-white/15 flex items-center justify-center text-xs font-bold shrink-0">
            📓
          </span>
          <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide truncate">
            {title}
          </h1>
        </div>

        {/* Kartu 2: Foto + Nama + NIP (PUTIH) */}
        <div className="hidden md:flex items-center gap-3 bg-white text-slate-800 rounded-lg px-3 py-2 shadow-sm border border-slate-200 shrink-0">
          <div className="w-9 h-12 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {teacherPhoto ? (
              <img src={teacherPhoto} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold leading-tight truncate max-w-[220px]">
              {teacherName || 'Guru Belum Terdaftar'}
            </p>
            <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[220px]">
              NIP. {teacherNip || '-'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}