import { supabase } from './supabase';
import type { TeacherData, JournalEntry, UserProfile } from '../types';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// ============ TEACHERS ============

export async function loadTeacher(): Promise<TeacherData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    console.error('loadTeacher:', error);
    return null;
  }
  if (!data) return null;
  return {
    name: data.name || '',
    nip: data.nip || '',
    position: data.position || '',
    subject: data.subject || '',
    workUnit: data.work_unit || '',
    kecamatan: data.kecamatan || '',
    grade: data.grade || '',
    principalName: data.principal_name || '',
    principalNip: data.principal_nip || '',
    supervisorName: data.supervisor_name || '',
    supervisorNip: data.supervisor_nip || '',
    headOfDeptName: data.head_of_dept_name || '',
    headOfDeptNip: data.head_of_dept_nip || '',
    npsn: data.npsn || '',
    schoolAddress: data.school_address || '',
    institution: data.institution || '',
    institutionAddress: data.institution_address || '',
    gasUrl: data.gas_url || '',
    targetEmail: data.target_email || '',
    schoolLogo: data.school_logo || '',
    districtLogo: data.district_logo || '',
    profilePhoto: data.profile_photo || '',
    signatureStampImage: data.signature_stamp_image || '',
    birthPlaceDate: data.birth_place_date || '',
    letterNumber: data.letter_number || '',
  };
}

export async function saveTeacher(t: TeacherData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Belum login');

  const { error } = await supabase.from('teachers').upsert(
    {
      user_id: user.id,
      name: t.name,
      nip: t.nip,
      birth_place_date: t.birthPlaceDate || '',
      position: t.position,
      subject: t.subject,
      grade: t.grade,
      institution: t.institution || '',
      work_unit: t.workUnit,
      kecamatan: t.kecamatan,
      npsn: t.npsn,
      institution_address: t.institutionAddress || '',
      school_address: t.schoolAddress,
      principal_name: t.principalName,
      principal_nip: t.principalNip,
      supervisor_name: t.supervisorName,
      supervisor_nip: t.supervisorNip,
      head_of_dept_name: t.headOfDeptName || '',
      head_of_dept_nip: t.headOfDeptNip || '',
      letter_number: t.letterNumber || '',
      target_email: t.targetEmail,
      gas_url: t.gasUrl,
      profile_photo: t.profilePhoto || '',
      signature_stamp_image: t.signatureStampImage || '',
      district_logo: t.districtLogo || '',
      school_logo: t.schoolLogo || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

// ============ JOURNALS ============

export async function loadJournals(): Promise<JournalEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('journals')
    .select('id, date, activities')
    .eq('user_id', user.id)
    .order('date', { ascending: true });
  if (error) {
    console.error('loadJournals:', error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id as string,
    date: row.date as string,
    activities: Array.isArray(row.activities) ? row.activities : [],
  }));
}

export async function upsertJournal(entry: JournalEntry): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Belum login');

  const dateOnly = entry.date.slice(0, 10);

  const { data, error } = await supabase
    .from('journals')
    .upsert(
      {
        user_id: user.id,
        date: dateOnly,
        activities: entry.activities,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateJournal(id: string, entry: JournalEntry): Promise<void> {
  const { error } = await supabase
    .from('journals')
    .update({
      date: entry.date.slice(0, 10),
      activities: entry.activities,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteJournal(id: string): Promise<void> {
  const { error } = await supabase.from('journals').delete().eq('id', id);
  if (error) throw error;
}

// ============ APPROVALS ============

export async function loadApprovals(): Promise<string[]> {
  const { data, error } = await supabase
    .from('approvals')
    .select('period_key, approved');
  if (error) {
    console.error('loadApprovals:', error);
    return [];
  }
  return (data || []).filter((r) => r.approved).map((r) => r.period_key as string);
}

export async function setApproval(periodKey: string, approved: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Belum login');

  if (approved) {
    const { error } = await supabase.from('approvals').upsert(
      { user_id: user.id, period_key: periodKey, approved: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,period_key' }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase.from('approvals').delete().eq('period_key', periodKey);
    if (error) throw error;
  }
}

// ============ PROFILES (role user) ============

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('getProfile:', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    role: (data.role as 'guru' | 'pengawas') || 'guru',
    email: data.email || '',
    workUnitBina: data.work_unit_bina || undefined,
  };
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: profile.id,
      role: profile.role,
      email: profile.email,
      work_unit_bina: profile.workUnitBina || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

// ============ PENGAWAS: data guru binaan ============

export interface GuruBinaanSummary {
  userId: string;
  name: string;
  nip: string;
  workUnit: string;
  position: string;
  subject: string;
  journalCount: number;
  activityCount: number;
  profilePhoto?: string;
}

export async function getGuruBinaan(workUnitBina: string): Promise<GuruBinaanSummary[]> {
  // 0. Ambil dulu daftar user_id yang role-nya 'guru' saja
  const { data: guruProfiles, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'guru');

  if (pErr) {
    console.error('getGuruBinaan profiles:', pErr);
    return [];
  }

  const guruIds = new Set((guruProfiles || []).map((p) => p.id));
  if (guruIds.size === 0) return [];

  // 1. Ambil teachers yang work_unit sama & role-nya guru
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('user_id, name, nip, work_unit, position, subject, profile_photo')
    .in('user_id', Array.from(guruIds));

  if (error) {
    console.error('getGuruBinaan teachers:', error);
    return [];
  }

  const matched = (teachers || []).filter(
    (t) =>
      (t.work_unit || '').toLowerCase().trim() === workUnitBina.toLowerCase().trim()
  );

  if (matched.length === 0) return [];

  const userIds = matched.map((t) => t.user_id);

  // 2. Ambil journals bulan ini untuk guru-guru binaan
  const now = new Date();
  const start = format(startOfMonth(now), 'yyyy-MM-dd');
  const end = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: journals, error: jErr } = await supabase
    .from('journals')
    .select('user_id, date, activities')
    .in('user_id', userIds)
    .gte('date', start)
    .lte('date', end);

  if (jErr) {
    console.error('getGuruBinaan journals:', jErr);
  }

  const journalsByUser = new Map<string, { count: number; activities: number }>();
  (journals || []).forEach((j: any) => {
    const curr = journalsByUser.get(j.user_id) || { count: 0, activities: 0 };
    curr.count += 1;
    curr.activities += Array.isArray(j.activities) ? j.activities.length : 0;
    journalsByUser.set(j.user_id, curr);
  });

  return matched.map((t) => {
    const stats = journalsByUser.get(t.user_id) || { count: 0, activities: 0 };
    return {
      userId: t.user_id,
      name: t.name || '(Tanpa Nama)',
      nip: t.nip || '',
      workUnit: t.work_unit || '',
      position: t.position || '',
      subject: t.subject || '',
      journalCount: stats.count,
      activityCount: stats.activities,
      profilePhoto: t.profile_photo || undefined,
    };
  });
}

// ============ PENGAWAS: verifikasi jurnal guru ============

export async function getJournalsByUser(
  userId: string,
  monthIdx: number,
  year: number
): Promise<JournalEntry[]> {
  const start = format(startOfMonth(new Date(year, monthIdx)), 'yyyy-MM-dd');
  const end = format(endOfMonth(new Date(year, monthIdx)), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('journals')
    .select('id, date, activities')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (error) {
    console.error('getJournalsByUser:', error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id as string,
    date: row.date as string,
    activities: Array.isArray(row.activities) ? row.activities : [],
  }));
}

export async function getApprovalsByUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('approvals')
    .select('period_key, approved')
    .eq('user_id', userId);
  if (error) {
    console.error('getApprovalsByUser:', error);
    return [];
  }
  return (data || []).filter((r) => r.approved).map((r) => r.period_key as string);
}

export async function setApprovalForUser(
  userId: string,
  periodKey: string,
  approved: boolean
): Promise<void> {
  if (approved) {
    const { error } = await supabase.from('approvals').upsert(
      {
        user_id: userId,
        period_key: periodKey,
        approved: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,period_key' }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('approvals')
      .delete()
      .eq('user_id', userId)
      .eq('period_key', periodKey);
    if (error) throw error;
  }
}

// ============ PENGAWAS: riwayat rekomendasi ============

export interface RekomendasiHistory {
  guruUserId: string;
  guruName: string;
  guruNip: string;
  periodKey: string;
  approved: boolean;
  updatedAt: string;
}

export async function getRekomendasiHistory(
  workUnitBina: string
): Promise<RekomendasiHistory[]> {
  // 1. Ambil guru binaan
  const { data: guruProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'guru');

  const guruIds = new Set((guruProfiles || []).map((p) => p.id));
  if (guruIds.size === 0) return [];

  const { data: teachers } = await supabase
    .from('teachers')
    .select('user_id, name, nip, work_unit');

  const matched = (teachers || []).filter(
    (t) =>
      guruIds.has(t.user_id) &&
      (t.work_unit || '').toLowerCase().trim() === workUnitBina.toLowerCase().trim()
  );

  if (matched.length === 0) return [];

  const userIds = matched.map((t) => t.user_id);
  const teacherMap = new Map(matched.map((t) => [t.user_id, t]));

  // 2. Ambil approvals mereka
  const { data: approvals, error } = await supabase
    .from('approvals')
    .select('user_id, period_key, approved, updated_at')
    .in('user_id', userIds)
    .eq('approved', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getRekomendasiHistory:', error);
    return [];
  }

  return (approvals || []).map((a: any) => {
    const t = teacherMap.get(a.user_id);
    return {
      guruUserId: a.user_id,
      guruName: t?.name || '(Tanpa Nama)',
      guruNip: t?.nip || '',
      periodKey: a.period_key,
      approved: !!a.approved,
      updatedAt: a.updated_at || '',
    };
  });
}

// ============ VERIFIKASI JURNAL (3 TAHAP) ============

export interface VerificationStatus {
  id?: string;
  guruId: string;
  periodKey: string;
  guruSubmittedAt?: string;
  kepsekStatus: 'pending' | 'approved' | 'rejected';
  kepsekVerifiedAt?: string;
  kepsekNote?: string;
  pengawasStatus: 'pending' | 'approved' | 'rejected';
  pengawasVerifiedAt?: string;
  pengawasNote?: string;
  isLocked: boolean;
  revisionCount: number;
}

function rowToVerification(row: any): VerificationStatus {
  return {
    id: row.id,
    guruId: row.guru_id,
    periodKey: row.period_key,
    guruSubmittedAt: row.guru_submitted_at,
    kepsekStatus: row.kepsek_status || 'pending',
    kepsekVerifiedAt: row.kepsek_verified_at,
    kepsekNote: row.kepsek_note,
    pengawasStatus: row.pengawas_status || 'pending',
    pengawasVerifiedAt: row.pengawas_verified_at,
    pengawasNote: row.pengawas_note,
    isLocked: !!row.is_locked,
    revisionCount: row.revision_count || 0,
  };
}

export async function getVerificationStatus(
  guruId: string,
  periodKey: string
): Promise<VerificationStatus | null> {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('guru_id', guruId)
    .eq('period_key', periodKey)
    .maybeSingle();
  if (error) {
    console.error('getVerificationStatus:', error);
    return null;
  }
  if (!data) return null;
  return rowToVerification(data);
}

export async function getAllVerifications(guruId: string): Promise<VerificationStatus[]> {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('guru_id', guruId)
    .order('period_key', { ascending: false });
  if (error) {
    console.error('getAllVerifications:', error);
    return [];
  }
  return (data || []).map(rowToVerification);
}

export async function submitJournalForVerification(
  guruId: string,
  periodKey: string
): Promise<void> {
  // Cek dulu apakah sudah ada
  const existing = await getVerificationStatus(guruId, periodKey);

  if (existing) {
    // Update: set submitted_at + lock + reset status
    const { error } = await supabase
      .from('verifications')
      .update({
        guru_submitted_at: new Date().toISOString(),
        kepsek_status: 'pending',
        pengawas_status: 'pending',
        is_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    // Insert baru
    const { error } = await supabase.from('verifications').insert({
      guru_id: guruId,
      period_key: periodKey,
      guru_submitted_at: new Date().toISOString(),
      kepsek_status: 'pending',
      pengawas_status: 'pending',
      is_locked: true,
      revision_count: 0,
    });
    if (error) throw error;
  }
}

export async function unlockJournalForRevision(
  guruId: string,
  periodKey: string
): Promise<void> {
  const { error } = await supabase
    .from('verifications')
    .update({
      is_locked: false,
      kepsek_status: 'pending',
      pengawas_status: 'pending',
      revision_count: (await getVerificationStatus(guruId, periodKey))?.revisionCount
        ? ((await getVerificationStatus(guruId, periodKey))?.revisionCount || 0) + 1
        : 1,
      updated_at: new Date().toISOString(),
    })
    .eq('guru_id', guruId)
    .eq('period_key', periodKey);
  if (error) throw error;
}

// ============ B4: Verifikasi oleh Kepala Sekolah ============

export interface PendingVerification {
  id: string;
  guruId: string;
  guruName: string;
  guruNip: string;
  guruPosition: string;
  periodKey: string;
  guruSubmittedAt?: string;
  kepsekStatus: 'pending' | 'approved' | 'rejected';
  kepsekNote?: string;
  kepsekVerifiedAt?: string;
  pengawasStatus: 'pending' | 'approved' | 'rejected';
}

export async function getPendingVerificationsForKepsek(
  workUnitBina: string
): Promise<PendingVerification[]> {
  // 0. Ambil dulu daftar user_id yang role-nya 'guru' saja
  //    (exclude kepsek, pengawas, dll)
  const { data: guruProfiles, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'guru');

  if (pErr) {
    console.error('getPendingVerifications profiles:', pErr);
    return [];
  }

  const guruProfileIds = new Set((guruProfiles || []).map((p) => p.id));
  if (guruProfileIds.size === 0) return [];

  // 1. Ambil teachers yang work_unit-nya sama
  const { data: teachers, error: tErr } = await supabase
    .from('teachers')
    .select('user_id, name, nip, position, work_unit');

  if (tErr) {
    console.error('getPendingVerifications teachers:', tErr);
    return [];
  }

  // 2. Filter: work_unit sama DAN role-nya 'guru'
  const matchedTeachers = (teachers || []).filter(
    (t) =>
      (t.work_unit || '').toLowerCase().trim() === workUnitBina.toLowerCase().trim() &&
      guruProfileIds.has(t.user_id)
  );

  if (matchedTeachers.length === 0) return [];

  const guruIds = new Set(matchedTeachers.map((t) => t.user_id));
  const teacherMap = new Map(matchedTeachers.map((t) => [t.user_id, t]));

  // 3. Ambil verifications
  const { data: verifs, error: vErr } = await supabase
    .from('verifications')
    .select('*')
    .in('guru_id', Array.from(guruIds))
    .order('guru_submitted_at', { ascending: false });

  if (vErr) {
    console.error('getPendingVerifications verifications:', vErr);
    return [];
  }

  return (verifs || []).map((v: any) => {
    const t = teacherMap.get(v.guru_id);
    return {
      id: v.id,
      guruId: v.guru_id,
      guruName: t?.name || '(Tanpa Nama)',
      guruNip: t?.nip || '',
      guruPosition: t?.position || '',
      periodKey: v.period_key,
      guruSubmittedAt: v.guru_submitted_at,
      kepsekStatus: v.kepsek_status || 'pending',
      kepsekNote: v.kepsek_note,
      kepsekVerifiedAt: v.kepsek_verified_at,
      pengawasStatus: v.pengawas_status || 'pending',
    };
  });
}

export async function approveKepsek(
  verificationId: string,
  kepsekUserId: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from('verifications')
    .update({
      kepsek_status: 'approved',
      kepsek_verified_by: kepsekUserId,
      kepsek_verified_at: new Date().toISOString(),
      kepsek_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId);
  if (error) throw error;
}

export async function rejectKepsek(
  verificationId: string,
  kepsekUserId: string,
  note: string
): Promise<void> {
  if (!note.trim()) throw new Error('Catatan wajib diisi saat menolak');

  const { error } = await supabase
    .from('verifications')
    .update({
      kepsek_status: 'rejected',
      kepsek_verified_by: kepsekUserId,
      kepsek_verified_at: new Date().toISOString(),
      kepsek_note: note.trim(),
      is_locked: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId);
  if (error) throw error;
}

// ============ B8: TTD & Cap Pejabat ============

export interface OfficerSignature {
  name: string;
  nip: string;
  signatureStampImage?: string;
}

/**
 * Ambil TTD + cap Kepala Sekolah dari sekolah tertentu
 * Dipakai saat guru cetak jurnal (supaya TTD kepsek muncul otomatis)
 */
export async function getKepsekSignature(
  workUnit: string
): Promise<OfficerSignature | null> {
  // Ambil user_id kepsek dari profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'kepala_sekolah');

  if (pErr || !profiles || profiles.length === 0) {
    return null;
  }

  const kepsekIds = profiles.map((p) => p.id);

  const { data: teachers, error: tErr } = await supabase
    .from('teachers')
    .select('user_id, name, nip, work_unit, signature_stamp_image')
    .in('user_id', kepsekIds);

  if (tErr || !teachers) return null;

  const match = teachers.find(
    (t) => (t.work_unit || '').toLowerCase().trim() === workUnit.toLowerCase().trim()
  );

  if (!match) return null;

  return {
    name: match.name || '',
    nip: match.nip || '',
    signatureStampImage: match.signature_stamp_image || undefined,
  };
}

/**
 * Ambil TTD + cap Pengawas Bina untuk sekolah tertentu
 * Dipakai saat cetak rekomendasi
 */
export async function getPengawasSignature(
  workUnitBina: string
): Promise<OfficerSignature | null> {
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'pengawas');

  if (pErr || !profiles || profiles.length === 0) {
    return null;
  }

  const pengawasIds = profiles.map((p) => p.id);

  const { data: teachers, error: tErr } = await supabase
    .from('teachers')
    .select('user_id, name, nip, work_unit, signature_stamp_image')
    .in('user_id', pengawasIds);

  if (tErr || !teachers) return null;

  // Cari pengawas yang work_unit-nya sama dengan sekolah guru
  const match = teachers.find(
    (t) => (t.work_unit || '').toLowerCase().trim() === workUnitBina.toLowerCase().trim()
  );

  if (!match) return null;

  return {
    name: match.name || '',
    nip: match.nip || '',
    signatureStampImage: match.signature_stamp_image || undefined,
  };
}

// ============ B9: Kepsek isi jurnal & kirim ke Pengawas ============

export async function submitKepsekJournal(
  kepsekUserId: string,
  periodKey: string
): Promise<void> {
  const existing = await getVerificationStatus(kepsekUserId, periodKey);

  if (existing) {
    const { error } = await supabase
      .from('verifications')
      .update({
        guru_submitted_at: new Date().toISOString(),
        kepsek_status: 'approved',
        kepsek_verified_by: kepsekUserId,
        kepsek_verified_at: new Date().toISOString(),
        kepsek_note: 'Auto-verified (self)',
        pengawas_status: 'pending',
        is_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('verifications').insert({
      guru_id: kepsekUserId,
      period_key: periodKey,
      guru_submitted_at: new Date().toISOString(),
      kepsek_status: 'approved',
      kepsek_verified_by: kepsekUserId,
      kepsek_verified_at: new Date().toISOString(),
      kepsek_note: 'Auto-verified (self)',
      pengawas_status: 'pending',
      is_locked: true,
      revision_count: 0,
    });
    if (error) throw error;
  }
}

// ============ PENGAWAS: data binaan lengkap (guru + kepsek) ============

export interface BinaanSummary extends GuruBinaanSummary {
  role: 'guru' | 'kepala_sekolah';
}

/**
 * Ambil SEMUA user binaan pengawas di work_unit tertentu:
 * - role 'guru'
 * - role 'kepala_sekolah' (kepsek di sekolah binaan)
 *
 * Dipakai oleh halaman "Verifikasi Rekomendasi" pengawas,
 * supaya kepsek juga bisa diawasi jurnalnya.
 */
export async function getAllBinaan(workUnitBina: string): Promise<BinaanSummary[]> {
  // 0. Ambil user_id dengan role 'guru' ATAU 'kepala_sekolah'
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, role')
    .in('role', ['guru', 'kepala_sekolah']);

  if (pErr) {
    console.error('getAllBinaan profiles:', pErr);
    return [];
  }

  const roleMap = new Map<string, 'guru' | 'kepala_sekolah'>();
  (profiles || []).forEach((p) => {
    roleMap.set(p.id, p.role as 'guru' | 'kepala_sekolah');
  });

  if (roleMap.size === 0) return [];

  // 1. Ambil teachers dengan work_unit yang sama
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('user_id, name, nip, work_unit, position, subject, profile_photo')
    .in('user_id', Array.from(roleMap.keys()));

  if (error) {
    console.error('getAllBinaan teachers:', error);
    return [];
  }

  const matched = (teachers || []).filter(
    (t) =>
      (t.work_unit || '').toLowerCase().trim() === workUnitBina.toLowerCase().trim()
  );

  if (matched.length === 0) return [];

  const userIds = matched.map((t) => t.user_id);

  // 2. Hitung statistik jurnal bulan ini
  const now = new Date();
  const start = format(startOfMonth(now), 'yyyy-MM-dd');
  const end = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: journals, error: jErr } = await supabase
    .from('journals')
    .select('user_id, date, activities')
    .in('user_id', userIds)
    .gte('date', start)
    .lte('date', end);

  if (jErr) {
    console.error('getAllBinaan journals:', jErr);
  }

  const journalsByUser = new Map<string, { count: number; activities: number }>();
  (journals || []).forEach((j: any) => {
    const curr = journalsByUser.get(j.user_id) || { count: 0, activities: 0 };
    curr.count += 1;
    curr.activities += Array.isArray(j.activities) ? j.activities.length : 0;
    journalsByUser.set(j.user_id, curr);
  });

  return matched.map((t) => {
    const stats = journalsByUser.get(t.user_id) || { count: 0, activities: 0 };
    return {
      userId: t.user_id,
      name: t.name || '(Tanpa Nama)',
      nip: t.nip || '',
      workUnit: t.work_unit || '',
      position: t.position || '',
      subject: t.subject || '',
      journalCount: stats.count,
      activityCount: stats.activities,
      profilePhoto: t.profile_photo || undefined,
      role: roleMap.get(t.user_id) || 'guru',
    };
  });
}
