/**
 * Data hari libur nasional & cuti bersama Indonesia.
 * Sumber: SKB 3 Menteri (Agama, Ketenagakerjaan, PAN-RB).
 *
 * Cara update tahun baru:
 * 1. Cari SKB 3 Menteri terbaru untuk tahun tersebut.
 * 2. Tambahkan array tahun baru di HOLIDAYS_BY_YEAR.
 * 3. Selesai — helper akan otomatis mendeteksi tahun yang tersedia.
 */

type HolidayMap = Record<number, string[]>;

/**
 * Format: 'YYYY-MM-DD' (ISO date, tanpa time).
 * Gabungan libur nasional + cuti bersama.
 */
export const HOLIDAYS_BY_YEAR: HolidayMap = {
  2026: [
    // === LIBUR NASIONAL 2026 ===
    '2026-01-01', // Tahun Baru 2026 Masehi
    '2026-01-16', // Isra Mikraj Nabi Muhammad SAW
    '2026-02-17', // Tahun Baru Imlek 2577 Kongzili
    '2026-03-19', // Hari Suci Nyepi (Tahun Baru Saka 1948)
    '2026-03-21', // Idulfitri 1447 Hijriah
    '2026-03-22', // Idulfitri 1447 Hijriah
    '2026-04-03', // Wafat Yesus Kristus
    '2026-04-05', // Kebangkitan Yesus Kristus (Paskah)
    '2026-05-01', // Hari Buruh Internasional
    '2026-05-14', // Kenaikan Yesus Kristus
    '2026-05-27', // Iduladha 1447 Hijriah
    '2026-05-31', // Hari Raya Waisak 2570 BE
    '2026-06-01', // Hari Lahir Pancasila
    '2026-06-16', // Tahun Baru Islam 1448 Hijriah
    '2026-08-17', // Proklamasi Kemerdekaan
    '2026-08-25', // Maulid Nabi Muhammad SAW
    '2026-12-25', // Kelahiran Yesus Kristus (Natal)

    // === CUTI BERSAMA 2026 ===
    '2026-02-16', // Tahun Baru Imlek 2577 Kongzili
    '2026-03-18', // Hari Suci Nyepi
    '2026-03-20', // Idulfitri 1447 Hijriah
    '2026-03-23', // Idulfitri 1447 Hijriah
    '2026-03-24', // Idulfitri 1447 Hijriah
    '2026-05-15', // Kenaikan Yesus Kristus
    '2026-05-28', // Iduladha 1447 Hijriah
    '2026-12-24', // Kelahiran Yesus Kristus (Natal)
  ],

  // Tambahkan tahun berikutnya di sini saat SKB baru terbit.
  // Contoh:
  // 2027: [ '2027-01-01', ... ],
};

/**
 * Daftar libur untuk satu tahun. Mengembalikan array kosong kalau
 * data tahun tersebut belum tersedia.
 */
export function getHolidaysForYear(year: number): string[] {
  return HOLIDAYS_BY_YEAR[year] || [];
}

/**
 * Cek apakah tanggal tertentu adalah hari libur (nasional atau cuti bersama).
 *
 * @param dateStr - Format 'YYYY-MM-DD' atau ISO date string.
 * @returns true kalau tanggal termasuk libur.
 */
export function isHoliday(dateStr: string): boolean {
  const normalized = dateStr.slice(0, 10); // ambil 'YYYY-MM-DD' saja
  const year = parseInt(normalized.slice(0, 4), 10);
  if (isNaN(year)) return false;
  const list = HOLIDAYS_BY_YEAR[year];
  if (!list) return false;
  return list.includes(normalized);
}

/**
 * Cek apakah tanggal tertentu adalah hari kerja
 * (bukan Sabtu, bukan Minggu, bukan hari libur).
 *
 * Catatan: fungsi ini menggunakan JavaScript Date, yang
 * hari-minggu-nya adalah 0=Sunday, 6=Saturday.
 */
export function isWorkday(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // weekend
  const dateStr = formatDateToISO(date);
  return !isHoliday(dateStr);
}

/**
 * Helper internal: ubah Date ke 'YYYY-MM-DD' (timezone lokal).
 */
function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}