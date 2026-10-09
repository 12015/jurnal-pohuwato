import { useMemo, useState } from 'react';
import { FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { format, endOfMonth, isWeekend, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { TeacherData } from '../../types';
import { HOLIDAYS_2026 } from '../../types';
import { cn } from '../../lib/utils';

interface SPTJMSekolahProps {
  teacher: TeacherData;
  addNotification: (message: string, type: 'success' | 'error') => void;
}

const monthsList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function getSignDate(year: number, mIdx: number): Date {
  let d = endOfMonth(new Date(year, mIdx));
  while (isWeekend(d) || HOLIDAYS_2026.includes(format(d, 'yyyy-MM-dd'))) {
    d = addDays(d, 1);
  }
  return d;
}

type PaperSize = 'A4' | 'F4';

const PAPER_SIZES: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215, height: 330 },
};

// Style helper
const labelStyle: React.CSSProperties = {
  padding: '1px 0',
  border: 'none',
  fontSize: '12pt',
  fontFamily: '"Times New Roman", Times, serif',
  verticalAlign: 'top',
  color: '#000',
};
const colonStyle: React.CSSProperties = {
  padding: '1px 0',
  border: 'none',
  fontSize: '12pt',
  fontFamily: '"Times New Roman", Times, serif',
  verticalAlign: 'top',
  textAlign: 'center',
  color: '#000',
};
const valueStyle: React.CSSProperties = {
  padding: '1px 0',
  border: 'none',
  fontSize: '12pt',
  fontFamily: '"Times New Roman", Times, serif',
  verticalAlign: 'top',
  fontWeight: 500,
  color: '#000',
  wordBreak: 'break-word',
};

export function SPTJMSekolah({ teacher, addNotification }: SPTJMSekolahProps) {
  const today = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(today.getMonth());
  const [filterYear, setFilterYear] = useState<number>(today.getFullYear());
  const [paperSize, setPaperSize] = useState<PaperSize>('F4');
  const [isExporting, setIsExporting] = useState(false);

  const bulanLabel = `${monthsList[filterMonth]} ${filterYear}`;
  const signDate = useMemo(
    () => getSignDate(filterYear, filterMonth),
    [filterYear, filterMonth]
  );

  const city = (teacher.kecamatan || 'Randangan').replace(/^Kecamatan\s+/i, '');
  const paper = PAPER_SIZES[paperSize];

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      addNotification('Menyiapkan PDF...', 'success');

      const element = document.getElementById('sptjm-sekolah-preview');
      if (!element) throw new Error('Elemen tidak ditemukan');

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png', 1.0);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [paper.width, paper.height],
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeightInPdf = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeightInPdf <= pdfHeight * 1.02) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeightInPdf, pdfHeight));
      } else {
        let heightLeft = imgHeightInPdf;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;
        while (heightLeft > 5) {
          position -= pdfHeight;
          pdf.addPage([paper.width, paper.height], 'portrait');
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
          heightLeft -= pdfHeight;
        }
      }

      pdf.save(`SPTJM_Sekolah_${paperSize}_${monthsList[filterMonth]}_${filterYear}.pdf`);
      addNotification(`PDF ${paperSize} berhasil diunduh!`, 'success');
    } catch (e) {
      console.error(e);
      addNotification('Gagal: ' + (e as Error).message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 no-print sticky top-0 z-20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              SPTJM Sekolah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Surat Pernyataan Tanggung Jawab Mutlak - diajukan ke Pengawas setiap bulan
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {monthsList.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                  paperSize === 'A4'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                  paperSize === 'F4'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                F4
              </button>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center bg-slate-200 p-4 rounded-lg overflow-x-auto">
        <div
          id="sptjm-sekolah-preview"
          style={{
            width: `${paper.width}mm`,
            minHeight: `${paper.height}mm`,
            padding: '20mm 20mm 10mm 20mm',
            background: '#ffffff',
            boxSizing: 'border-box',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '12pt',
            lineHeight: 1.5,
            color: '#000',
            border: '2px double #000',
          }}
        >
          {/* Kop surat */}
          <div style={{ width: '100%', marginBottom: '12px', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
              <tbody>
                <tr style={{ border: 'none' }}>
                  <td style={{ width: '80px', border: 'none', verticalAlign: 'middle', textAlign: 'left', padding: 0 }}>
                    {teacher.districtLogo && teacher.districtLogo.trim() !== '' ? (
                      <img
                        src={teacher.districtLogo}
                        alt=""
                        style={{ width: '75px', height: '75px', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '75px', height: '75px' }}></div>
                    )}
                  </td>
                  <td style={{ border: 'none', verticalAlign: 'middle', textAlign: 'center', padding: '0 8px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13pt', textAlign: 'center', textTransform: 'uppercase', lineHeight: '1.2', color: '#000' }}>
                      PEMERINTAH KABUPATEN POHUWATO
                    </p>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13pt', textAlign: 'center', textTransform: 'uppercase', lineHeight: '1.2', color: '#000' }}>
                      {teacher.institution ? teacher.institution.toUpperCase() : 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
                    </p>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15pt', textAlign: 'center', textTransform: 'uppercase', lineHeight: '1.2', letterSpacing: '0.5px', color: '#000' }}>
                      {teacher.workUnit ? teacher.workUnit.toUpperCase() : 'SMP NEGERI 1 RANDANGAN'}
                    </p>
                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '8pt', textAlign: 'center', lineHeight: '1.2', color: '#000' }}>
                      {teacher.schoolAddress || ''}
                    </p>
                  </td>
                  <td style={{ width: '80px', border: 'none', verticalAlign: 'middle', textAlign: 'right', padding: 0 }}>
                    {teacher.schoolLogo && teacher.schoolLogo.trim() !== '' ? (
                      <img
                        src={teacher.schoolLogo}
                        alt=""
                        style={{ width: '75px', height: '75px', objectFit: 'contain', display: 'block', marginLeft: 'auto' }}
                      />
                    ) : (
                      <div style={{ width: '75px', height: '75px' }}></div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ borderTop: '3px double #000000', marginTop: '6px', marginBottom: '10px', height: 0 }}></div>
          </div>

          {/* Judul — tanpa underline */}
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '16px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase', margin: 0, fontFamily: '"Times New Roman", serif', color: '#000' }}>
              SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK
            </h3>
            <h4 style={{ fontWeight: 'bold', fontSize: '12pt', textTransform: 'uppercase', margin: '4px 0 0', fontFamily: '"Times New Roman", serif', color: '#000' }}>
              KEBENARAN DATA GURU PADA DAPODIK
            </h4>
          </div>

          {/* Body */}
          <div style={{ fontSize: '12pt', lineHeight: 1.5, color: '#000' }}>
            <p style={{ margin: '0 0 8px' }}>Yang bertanda tangan di bawah ini :</p>

            <table style={{ borderCollapse: 'collapse', border: 'none', width: '100%', marginLeft: '20px', marginBottom: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ ...labelStyle, width: '190px' }}>Nama</td>
                  <td style={{ ...colonStyle, width: '15px' }}>:</td>
                  <td style={valueStyle}>{teacher.name || '..........................'}</td>
                </tr>
                <tr>
                  <td style={{ ...labelStyle, width: '190px' }}>NIP</td>
                  <td style={{ ...colonStyle, width: '15px' }}>:</td>
                  <td style={valueStyle}>{teacher.nip || '..........................'}</td>
                </tr>
                <tr>
                  <td style={{ ...labelStyle, width: '190px' }}>Jabatan</td>
                  <td style={{ ...colonStyle, width: '15px' }}>:</td>
                  <td style={valueStyle}>Kepala Satuan Pendidikan</td>
                </tr>
                <tr>
                  <td style={{ ...labelStyle, width: '190px' }}>Nama Satuan Pendidikan</td>
                  <td style={{ ...colonStyle, width: '15px' }}>:</td>
                  <td style={valueStyle}>{teacher.workUnit || '..........................'}</td>
                </tr>
                <tr>
                  <td style={{ ...labelStyle, width: '190px' }}>NPSN</td>
                  <td style={{ ...colonStyle, width: '15px' }}>:</td>
                  <td style={valueStyle}>{teacher.npsn || '..........................'}</td>
                </tr>
                <tr>
                  <td style={{ ...labelStyle, width: '190px' }}>Alamat Unit Kerja</td>
                  <td style={{ ...colonStyle, width: '15px' }}>:</td>
                  <td style={valueStyle}>{teacher.schoolAddress || '..........................'}</td>
                </tr>
              </tbody>
            </table>

            <p style={{ margin: '12px 0 8px', textAlign: 'justify' }}>
              Dengan ini menyatakan dengan sesungguhnya bahwa:
            </p>

                        {/* List 1-5 manual (agar nomor muncul di html2canvas) */}
            <div style={{ margin: 0, textAlign: 'justify' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ minWidth: '20px', flexShrink: 0 }}>1.</span>
                <div style={{ flex: 1 }}>
                  Data guru yang diusulkan dan dikirimkan melalui aplikasi Data Pokok Pendidikan (Dapodik) pada bulan <strong>{bulanLabel}</strong> telah mencerminkan kondisi keaktifan guru yang sebenarnya di satuan pendidikan, meliputi:
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}><span style={{ minWidth: '20px' }}>a.</span><span style={{ flex: 1 }}>kehadiran,</span></div>
                    <div style={{ display: 'flex', gap: '8px' }}><span style={{ minWidth: '20px' }}>b.</span><span style={{ flex: 1 }}>penugasan,</span></div>
                    <div style={{ display: 'flex', gap: '8px' }}><span style={{ minWidth: '20px' }}>c.</span><span style={{ flex: 1 }}>pemenuhan jam mengajar sesuai ketentuan, dan</span></div>
                    <div style={{ display: 'flex', gap: '8px' }}><span style={{ minWidth: '20px' }}>d.</span><span style={{ flex: 1 }}>status aktif melaksanakan tugas.</span></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ minWidth: '20px', flexShrink: 0 }}>2.</span>
                <div style={{ flex: 1 }}>
                  Data pangkat/golongan dan masa kerja guru yang tercantum dalam Dapodik telah disesuaikan dan disinkronkan dengan data pada aplikasi MyASN, berdasarkan dokumen dan informasi kepegawaian yang sah.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ minWidth: '20px', flexShrink: 0 }}>3.</span>
                <div style={{ flex: 1 }}>
                  Kelengkapan dan kebenaran data kepegawaian guru, khususnya yang berkaitan dengan riwayat pangkat/golongan dan riwayat masa kerja berkala, telah diverifikasi oleh satuan pendidikan dan bersumber dari data yang disampaikan oleh guru yang bersangkutan sebagai pemilik data.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ minWidth: '20px', flexShrink: 0 }}>4.</span>
                <div style={{ flex: 1 }}>
                  Saya bertanggung jawab penuh atas kebenaran seluruh data guru yang diusulkan dalam Dapodik sebagaimana dimaksud dalam pernyataan ini.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ minWidth: '20px', flexShrink: 0 }}>5.</span>
                <div style={{ flex: 1 }}>
                  Apabila di kemudian hari ditemukan ketidaksesuaian data keaktifan guru pada Dapodik dengan kondisi nyata di lapangan (guru tidak aktif, tidak melaksanakan tugas, atau tidak memenuhi kewajiban mengajar) yang mengakibatkan pembayaran Tunjangan Profesi Guru, Tambahan Penghasilan, dan/atau Tunjangan Khusus Guru yang tidak semestinya, maka saya bersedia bertanggung jawab sepenuhnya atas kerugian yang ditimbulkan, sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.
                </div>
              </div>
            </div>

            <p style={{ margin: '12px 0 8px', textAlign: 'justify' }}>
              Demikian Surat Pernyataan Tanggung Jawab Mutlak ini saya buat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
            </p>
          </div>

          {/* Tanda tangan — tanpa kotak meterai */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '32px' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', border: 'none' }}></td>
                <td style={{ width: '50%', border: 'none', textAlign: 'center', verticalAlign: 'top', fontSize: '12pt', fontFamily: '"Times New Roman", serif', color: '#000' }}>
                  <p style={{ margin: 0 }}>{city}, {format(signDate, 'd MMMM yyyy', { locale: localeId })}</p>
                  <p style={{ margin: 0 }}>Yang Membuat Pernyataan,</p>
                  {/* Ruang tanda tangan basah */}
                  <div style={{ height: '80px' }}></div>
                  <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>{teacher.name || '..........................'}</p>
                  <p style={{ margin: 0 }}>NIP. {teacher.nip || '..........................'}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}