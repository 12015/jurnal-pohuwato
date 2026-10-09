import { Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { TeacherData, UserProfile } from '../../types';

interface DashboardKepsekProps {
  profile: UserProfile;
  teacher: TeacherData;
}

export function DashboardKepsek({ profile, teacher }: DashboardKepsekProps) {
  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Header sambutan */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl p-5 sm:p-6 shadow-sm">
        <p className="text-sm text-emerald-100 mb-1">
          {format(today, 'EEEE, d MMMM yyyy', { locale: localeId })}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold">
          Selamat datang, {teacher.name || 'Bapak/Ibu Kepala Sekolah'}
        </h2>
        <p className="text-sm text-emerald-100 mt-1">
          Unit Kerja: <span className="font-semibold">{profile.workUnitBina || '-'}</span>
        </p>
      </div>

      {/* Info sedang dikembangkan */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">Dashboard sedang dikembangkan</p>
            <p className="text-sm text-amber-800 mt-1">
              Fitur verifikasi jurnal, antrian verifikasi, dan SPTJM Sekolah akan ditambahkan
              pada tahap berikutnya.
            </p>
          </div>
        </div>
      </div>

      {/* Kartu placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Total Guru
          </p>
          <p className="text-2xl font-bold text-slate-900">-</p>
          <p className="text-[11px] text-slate-500 mt-1">Guru di sekolah</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Terverifikasi
          </p>
          <p className="text-2xl font-bold text-emerald-600">-</p>
          <p className="text-[11px] text-slate-500 mt-1">Bulan ini</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Menunggu
          </p>
          <p className="text-2xl font-bold text-amber-600">-</p>
          <p className="text-[11px] text-slate-500 mt-1">Antrian verifikasi</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-xs mb-1">
            Perlu Perhatian
          </p>
          <p className="text-2xl font-bold text-rose-600">-</p>
          <p className="text-[11px] text-slate-500 mt-1">Belum isi jurnal</p>
        </div>
      </div>
    </div>
  );
}