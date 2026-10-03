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
  npsn: string;
  schoolAddress: string;
  institution?: string;
  institutionAddress?: string;
  gasUrl: string;
  targetEmail: string;
  schoolLogo?: string;
  districtLogo?: string;
  profilePhoto?: string;
  birthPlaceDate?: string;
  letterNumber?: string;
  agreementLetterNumber?: string;
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
  npsn: '',
  schoolAddress: '',
  institution: '',
  institutionAddress: '',
  gasUrl: '',
  targetEmail: '',
  schoolLogo: '',
  districtLogo: '',
  profilePhoto: '',
  birthPlaceDate: '',
  letterNumber: '',
  agreementLetterNumber: '',
};

export const HOLIDAYS_2026 = [
  '2026-01-01', // New Year
  '2026-03-30', // Example holiday
  // Add more as needed or use a library
];
