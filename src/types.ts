export interface TeacherData {
  name: string;
  nip: string;
  position: string;
  subject: string;
  workUnit: string;
  kecamatan: string;
  grade: string;
  principalName: string;
  principalNip: string;
  supervisorName: string;
  supervisorNip: string;
  headOfDeptName?: string;
  headOfDeptNip?: string;
  npsn: string;
  schoolAddress: string;
  institution?: string;
  institutionAddress?: string;
  gasUrl: string;
  targetEmail: string;
  schoolLogo?: string;
  districtLogo?: string;
  profilePhoto?: string;
  signatureStampImage?: string;
  birthPlaceDate?: string;
  letterNumber?: string;
}

export interface JournalActivity {
  jam: string;
  jenisKegiatan: string;
  agendaMapel: string;
  lokasiKelas: string;
  kegiatanTujuan: string;
  keterangan: string;
  // Legacy fields fallback
  subject?: string;
  topic?: string;
  goal?: string;
  activity?: string;
  studentCount?: number;
  class?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  activities: JournalActivity[];
}

export interface AppState {
  teacher: TeacherData;
  journals: JournalEntry[];
  isSupervisorApproved: boolean;
}

export const INITIAL_TEACHER_DATA: TeacherData = {
  name: '',
  nip: '',
  position: '',
  subject: '',
  workUnit: '',
  kecamatan: '',
  grade: '',
  principalName: '',
  principalNip: '',
  supervisorName: '',
  supervisorNip: '',
  headOfDeptName: '',
  headOfDeptNip: '',
  npsn: '',
  schoolAddress: '',
  institution: '',
  institutionAddress: '',
  gasUrl: '',
  targetEmail: '',
  schoolLogo: '',
  districtLogo: '',
  profilePhoto: '',
  signatureStampImage: '',
  birthPlaceDate: '',
  letterNumber: '',
};

export { getHolidaysForYear, isHoliday, isWorkday } from './lib/holidays';

export type UserRole = 'guru' | 'kepala_sekolah' | 'pengawas' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string;
  workUnitBina?: string;    // legacy, untuk display
  npsnBina?: string;         // khusus kepsek (single sekolah)
  npsnBinaList?: string[];   // khusus pengawas (multi sekolah)
}

export type TabKey =
  | 'dashboard'
  | 'profile'
  | 'journal'
  | 'preview'
  | 'pw_dashboard'
  | 'pw_teachers'
  | 'pw_approve'
  | 'ks_dashboard'
  | 'ks_queue'
  | 'ks_teachers'
  | 'ks_journal'
  | 'ks_preview'
  | 'ks_sptjm'
  | 'admin'
;

// ============ ADMIN TYPES ============
export interface AdminStats {
  totalUsers: number;
  totalGuru: number;
  totalKepsek: number;
  totalPengawas: number;
  totalJournals: number;
  totalSekolah: number;
  activeCodes: number;
  usedCodes: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  name: string | null;
  nip: string | null;
  npsn_bina: string | null;
  work_unit_bina: string | null;
}

export interface InviteCode {
  id: string;
  code: string;
  role: string;
  notes: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

export interface MasterSekolahRow {
  npsn: string;
  nama_sekolah: string;
  kecamatan: string | null;
}
