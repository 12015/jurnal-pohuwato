import { useState } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from './hooks/useAuth';

type RegisterMode = 'guru' | 'pejabat';

const INVITE_PENGAWAS = import.meta.env.VITE_INVITE_CODE_PENGAWAS as string | undefined;
const INVITE_KEPSEK = import.meta.env.VITE_INVITE_CODE_KEPSEK as string | undefined;

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerAs, setRegisterAs] = useState<RegisterMode>('guru');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [workUnitBina, setWorkUnitBina] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const switchToLogin = () => {
    setMode('login');
    resetMessages();
  };

  const switchToRegister = (as: RegisterMode) => {
    setMode('register');
    setRegisterAs(as);
    setInviteCode('');
    setWorkUnitBina('');
    resetMessages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        return;
      }

      // ==== REGISTER ====
      if (password.length < 6) throw new Error('Password minimal 6 karakter');
      if (password !== confirm) throw new Error('Konfirmasi password tidak cocok');

      if (registerAs === 'guru') {
        await signUp(email.trim(), password, 'guru');
        setInfo('Pendaftaran berhasil. Silakan login.');
        setMode('login');
        setPassword('');
        setConfirm('');
        return;
      }

      // ==== REGISTER PEJABAT (pengawas / kepsek) ====
      if (!workUnitBina.trim()) {
        throw new Error('Unit Kerja wajib diisi');
      }

      // Tentukan role yang dituju berdasarkan kode yang dipilih user
      const targetRole = inviteCode.startsWith('KS-') ? 'kepala_sekolah' : 'pengawas';

      // Pilih kode yang tepat untuk role target
      const expectedCode = targetRole === 'kepala_sekolah' ? INVITE_KEPSEK : INVITE_PENGAWAS;

      if (!expectedCode) {
        throw new Error('Kode undangan belum dikonfigurasi. Hubungi admin.');
      }

      if (inviteCode.trim() !== expectedCode) {
        throw new Error('Kode undangan salah');
      }

      await signUp(email.trim(), password, targetRole, workUnitBina.trim());

      setInfo('Pendaftaran pejabat berhasil. Silakan login.');
      setMode('login');
      setPassword('');
      setConfirm('');
      setInviteCode('');
      setWorkUnitBina('');
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
                  onClick={() => switchToRegister('guru')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    registerAs === 'guru'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  GURU
                </button>
                <button
                  type="button"
                  onClick={() => switchToRegister('pejabat')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    registerAs === 'pejabat'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  PENGAWAS / KEPSEK
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {registerAs === 'guru'
                  ? 'Pendaftaran guru tidak memerlukan kode undangan.'
                  : 'Pendaftaran pejabat memerlukan kode undangan dari Dinas Pendidikan.'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@example.com"
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

          {mode === 'register' && registerAs === 'pejabat' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  KODE UNDANGAN
                </label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Masukkan kode dari Dinas"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: <code className="bg-slate-100 px-1 rounded">KS-xxx</code> untuk Kepala Sekolah,{' '}
                  <code className="bg-slate-100 px-1 rounded">PW-xxx</code> untuk Pengawas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {inviteCode.startsWith('KS-')
                    ? 'UNIT KERJA SEKOLAH'
                    : 'UNIT KERJA YANG DIBINA'}
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
                  ini otomatis masuk daftar {inviteCode.startsWith('KS-') ? 'verifikasi' : 'binaan'} Anda.
                </p>
              </div>
            </>
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
                onClick={() => switchToRegister('guru')}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Daftar sekarang
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button
                onClick={switchToLogin}
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