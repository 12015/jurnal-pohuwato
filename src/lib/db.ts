import { supabase } from './supabase';
import type { TeacherData, JournalEntry } from '../types';

// ============ TEACHERS ============

export async function loadTeacher(): Promise<TeacherData | null> {
  const { data, error } = await supabase.from('teachers').select('*').maybeSingle();
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
    npsn: data.npsn || '',
    schoolAddress: data.school_address || '',
    institution: data.institution || '',
    institutionAddress: data.institution_address || '',
    gasUrl: data.gas_url || '',
    targetEmail: data.target_email || '',
    schoolLogo: data.school_logo || '',
    districtLogo: data.district_logo || '',
    profilePhoto: data.profile_photo || '',
    birthPlaceDate: data.birth_place_date || '',
    letterNumber: data.letter_number || '',
    agreementLetterNumber: data.agreement_letter_number || '',
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
      letter_number: t.letterNumber || '',
      agreement_letter_number: t.agreementLetterNumber || '',
      target_email: t.targetEmail,
      gas_url: t.gasUrl,
      profile_photo: t.profilePhoto || '',
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
  const { data, error } = await supabase
    .from('journals')
    .select('id, date, activities')
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