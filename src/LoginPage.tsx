import { useState } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import type { UserRole } from './types';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [workUnitBina, setWorkUnitBina] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (password.length < 6) throw new Error('Password minimal 6 karakter');
        if (password !== confirm) throw new Error('Konfirmasi password tidak cocok');
        if ((role === 'pengawas' || role === 'kepala_sekolah') && !workUnitBina.trim()) {
          throw new Error(
            role === 'pengawas'
              ? 'Unit kerja yang dibina wajib diisi untuk pengawas'
              : 'Unit kerja sekolah wajib diisi untuk kepala sekolah'
          );
        }
        await signUp(
          email.trim(),
          password,
          role,
          role === 'pengawas' || role === 'kepala_sekolah' ? workUnitBina.trim() : undefined
        );
        setInfo('Pendaftaran berhasil. Silakan login.');
        setMode('login');
        setPassword('');
        setConfirm('');
      }
    } catch (err) {
      setError((err as Error).message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">JURNAL GURU</h1>
          <p className="text-sm text-slate-500 mt-1">Kabupaten Pohuwato</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                DAFTAR SEBAGAI
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('guru')}
                  className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition-colors ${
                    role === 'guru'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  GURU
                </button>
                <button
                  type="button"
                  onClick={() => setRole('kepala_sekolah')}
                  className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition-colors ${
                    role === 'kepala_sekolah'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  KEPALA SEKOLAH
                </button>
                <button
                  type="button"
                  onClick={() => setRole('pengawas')}
                  className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-semibold border transition-colors ${
                    role === 'pengawas'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  PENGAWAS
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guru@example.com"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                KONFIRMASI PASSWORD
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi password"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
            </div>
          )}

          {mode === 'register' && role === 'pengawas' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                UNIT KERJA YANG DIBINA
              </label>
              <input
                type="text"
                required
                value={workUnitBina}
                onChange={(e) => setWorkUnitBina(e.target.value)}
                placeholder="SMP Negeri 1 Randangan"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tulis sama persis dengan Unit Kerja guru. Guru yang mendaftar dengan Unit Kerja
                ini otomatis masuk daftar binaan Anda.
              </p>
            </div>
          )}

          {mode === 'register' && role === 'kepala_sekolah' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                UNIT KERJA SEKOLAH
              </label>
              <input
                type="text"
                required
                value={workUnitBina}
                onChange={(e) => setWorkUnitBina(e.target.value)}
                placeholder="SMP Negeri 1 Randangan"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tulis sama persis dengan Unit Kerja guru di sekolah Anda. Guru yang mendaftar
                dengan Unit Kerja ini otomatis masuk daftar verifikasi Anda.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <>
              Belum punya akun?{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setError('');
                  setInfo('');
                }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Daftar sekarang
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                  setInfo('');
                }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Masuk
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}