import { useState, useEffect } from 'react';
import { Loader2, LogIn, UserPlus, CheckCircle2, AlertCircle, School, Info } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { lookupSekolahByNpsn } from './lib/db';

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
  const [npsnBina, setNpsnBina] = useState('');
  const [npsnBinaText, setNpsnBinaText] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [lookupResult, setLookupResult] = useState<{ npsn: string; namaSekolah: string }[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isKepsek = inviteCode.startsWith('KS-');

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
    setNpsnBina('');
    setNpsnBinaText('');
    setLookupResult([]);
    resetMessages();
  };

  // Reset lookup ketika input berubah
  useEffect(() => {
    setLookupResult([]);
  }, [npsnBina, npsnBinaText, isKepsek]);

  const doLookup = async () => {
    const list = isKepsek
      ? npsnBina.trim()
        ? [npsnBina.trim()]
        : []
      : npsnBinaText
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

    if (list.length === 0) {
      setLookupResult([]);
      return;
    }

    setLookingUp(true);
    try {
      const result = await lookupSekolahByNpsn(list);
      setLookupResult(result);
    } catch (e) {
      console.error(e);
      setLookupResult([]);
    } finally {
      setLookingUp(false);
    }
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

      // ==== REGISTER PEJABAT ====
      const targetRole = isKepsek ? 'kepala_sekolah' : 'pengawas';
      const expectedCode = targetRole === 'kepala_sekolah' ? INVITE_KEPSEK : INVITE_PENGAWAS;

      if (!expectedCode) throw new Error('Kode undangan belum dikonfigurasi. Hubungi admin.');
      if (inviteCode.trim() !== expectedCode) throw new Error('Kode undangan salah');

      // Validasi NPSN
      let npsnList: string[] = [];
      if (isKepsek) {
        const npsn = npsnBina.trim();
        if (!/^\d{8}$/.test(npsn)) throw new Error('NPSN harus 8 digit angka');
        npsnList = [npsn];
      } else {
        npsnList = npsnBinaText
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (npsnList.length === 0) throw new Error('Isi minimal 1 NPSN sekolah binaan');
        if (npsnList.length > 5) throw new Error('Maksimal 5 sekolah binaan');
        const invalid = npsnList.find((n) => !/^\d{8}$/.test(n));
        if (invalid) throw new Error(`NPSN "${invalid}" tidak valid (harus 8 digit angka)`);
      }

      // Auto-generate workUnitBina dari hasil lookup atau fallback
      const finalLookup = lookupResult.length > 0
        ? lookupResult
        : await lookupSekolahByNpsn(npsnList);

      const workUnitBina = finalLookup
        .map((r) => r.namaSekolah)
        .filter((n) => n && !n.includes('tidak ditemukan'))
        .join(', ') || (isKepsek ? `NPSN ${npsnList[0]}` : `Binaan ${npsnList.length} sekolah`);

      await signUp(email.trim(), password, targetRole, workUnitBina.trim(), npsnList);

      setInfo('Pendaftaran pejabat berhasil. Silakan login.');
      setMode('login');
      setPassword('');
      setConfirm('');
      setInviteCode('');
      setNpsnBina('');
      setNpsnBinaText('');
      setLookupResult([]);
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
          <img
            src="/logo-kabupaten.png"
            alt="Logo Kabupaten Pohuwato"
            className="w-20 h-20 mx-auto mb-3 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold text-slate-900">JURNAL KEGIATAN GURU</h1>
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

              {isKepsek ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    NPSN SEKOLAH
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={8}
                    value={npsnBina}
                    onChange={(e) => setNpsnBina(e.target.value.replace(/\D/g, ''))}
                    onBlur={doLookup}
                    placeholder="40500733"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    NPSN sekolah (8 digit). Sistem akan mencari nama sekolah secara otomatis.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    DAFTAR NPSN SEKOLAH BINAAN
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={npsnBinaText}
                    onChange={(e) => setNpsnBinaText(e.target.value)}
                    onBlur={doLookup}
                    placeholder={'40500733\n40401234\n40405678'}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono resize-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Satu NPSN per baris (8 digit). Maksimal 5 sekolah.
                  </p>
                </div>
              )}

              {/* Preview hasil lookup */}
              {(lookingUp || lookupResult.length > 0) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    <School className="w-3.5 h-3.5" />
                    Sekolah Terdeteksi
                    {lookingUp && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                  </div>
                  {lookupResult.map((r) => {
                    const notFound = r.namaSekolah.includes('tidak ditemukan');
                    return (
                      <div
                        key={r.npsn}
                        className={`flex items-start gap-2 text-xs ${
                          notFound ? 'text-slate-500' : 'text-slate-700'
                        }`}
                      >
                        {notFound ? (
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] text-slate-500">{r.npsn}</p>
                          <p className={`font-medium ${notFound ? 'italic' : ''}`}>
                            {notFound ? 'Belum terdaftar di sistem' : r.namaSekolah}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {lookupResult.some((r) => r.namaSekolah.includes('tidak ditemukan')) && (
                    <p className="text-[10px] text-slate-500 italic pt-1.5 border-t border-slate-200 mt-1.5 leading-relaxed">
                      NPSN yang belum terdaftar akan otomatis muncul setelah ada guru/kepsek
                      dari sekolah tersebut mendaftar. Anda tetap bisa melanjutkan pendaftaran.
                    </p>
                  )}
                </div>
              )}
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

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-mono">
            By 1201512145
          </p>
        </div>
      </div>
    </div>
  );
}