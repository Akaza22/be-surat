const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ PERBAIKAN UNTUK VERCEL: Simpan file di RAM (Buffer), bukan di harddisk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

// ✅ FUNGSI BARU: Mengubah Buffer memori langsung ke format base64 Gemini
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: mimeType
    },
  };
}

app.post('/api/scan', upload.single('dokumen'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'File Kosong', message: 'Tidak ada file yang diunggah.' });
  }

  try {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      throw new Error(`Format file tidak didukung: ${req.file.mimetype}`);
    }

    // ✅ Ambil file langsung dari buffer memori
    const documentPart = bufferToGenerativePart(req.file.buffer, req.file.mimetype);

    const prompt = `
      Kamu adalah ARKASHA AI, sistem kecerdasan buatan untuk manajemen persuratan dan disposisi di lingkungan organisasi.

      Tugasmu adalah menganalisis dokumen surat yang diberikan (PDF atau gambar), memahami isi surat, lalu mengekstrak informasi penting dalam format JSON yang valid.

      ATURAN PENTING:

      * Output HARUS berupa JSON murni.
      * Jangan menggunakan markdown.
      * Jangan menambahkan penjelasan sebelum atau sesudah JSON.
      * Jika data tidak ditemukan, isi dengan null.
      * Gunakan bahasa Indonesia.
      * Pastikan JSON valid dan dapat diproses langsung oleh JSON.parse().

      Ekstrak informasi berikut:

      {
      "nomor_surat": "",
      "tanggal_surat": "",
      "pengirim": "",
      "perihal": "",
      "lampiran": "",
      "jenis_surat": "",
      "ringkasan_isi": "",
      "rekomendasi_unit": "",
      "urgensi": "",
      "confidence": 0
      }

      Definisi field:

      1. nomor_surat

      * Nomor resmi surat.
      * Contoh: B/123/VI/2026

      2. tanggal_surat

      * Tanggal surat dibuat atau ditandatangani.
      * Format: YYYY-MM-DD jika memungkinkan.

      3. pengirim

      * Instansi atau pejabat yang mengirim surat.

      4. perihal

      * Isi bagian Perihal atau Hal.

      5. lampiran

      * Jumlah atau keterangan lampiran.
      * Jika tidak ada tulis "Tidak ada".

      6. jenis_surat
        Pilih SATU yang paling sesuai:

      * Nota Dinas
      * Telegram
      * Surat Biasa
      * Undangan
      * Surat Perintah
      * Keputusan
      * Laporan
      * Permintaan Data
      * Pengaduan
      * Lainnya

      7. ringkasan_isi

      * Buat ringkasan isi surat maksimal 2 kalimat.
      * Fokus pada tujuan utama surat dan tindakan yang diminta.

      8. rekomendasi_unit
        Analisis isi surat dan pilih SATU unit yang paling relevan:

      * DIREKTUR
      * WAKIL_DIREKTUR
      * SUBBAGRENMIN
      * BAGBINOPSNAL
      * WASSIDIK
      * KEUANGAN
      * KORWAS_PPNS
      * KASUBDIT_1
      * KASUBDIT_2
      * KASUBDIT_3
      * SPRI

      9. urgensi
        Pilih SATU:

      * Tinggi
      * Sedang
      * Rendah

      Penentuan:

      * Tinggi: terdapat kata "SEGERA", "SANGAT SEGERA", "KILAT", batas waktu sangat dekat, atau membutuhkan tindakan segera.
      * Sedang: terdapat tenggat waktu normal atau permintaan tindak lanjut.
      * Rendah: surat informasi umum atau pemberitahuan biasa.

      10. "tujuan_surat": (String)

          WAJIB ekstrak pihak, jabatan, atau instansi yang menjadi penerima surat sebagaimana tertulis pada dokumen.

          Contoh:
          - "Kapolda Jawa Barat"
          - "Direktur Reserse Siber Polda Jawa Barat"
          - "Kepala SMP Negeri 2 Sukadana"
          - "Kepala Dinas Pendidikan Kabupaten Bekasi"

          Aturan:
          - Ambil tujuan surat yang benar-benar tertulis pada bagian tujuan/alamat surat.
          - Jangan mengisi berdasarkan hasil analisis AI.
          - Jangan mengisi unit disposisi internal.
          - Jika terdapat beberapa penerima, pilih penerima utama.
          - Jika tidak ditemukan, isi null.

      11. confidence

      * Nilai keyakinan AI dalam rentang 0 sampai 100.
      * Berdasarkan kejelasan isi dokumen dan kecocokan klasifikasi.

      Contoh output:

      {
      "nomor_surat": "B/123/VI/2026",
      "tanggal_surat": "2026-06-20",
      "pengirim": "Polda Jawa Barat",
      "tujuan_surat": "Kapolres Jajaran Polda Jawa Barat",
      "perihal": "Undangan Rapat Koordinasi",
      "lampiran": "1 Berkas",
      "jenis_surat": "Undangan",
      "ringkasan_isi": "Surat berisi undangan rapat koordinasi terkait evaluasi kinerja semester pertama tahun 2026.",
      "rekomendasi_unit": "SUBBAGRENMIN",
      "urgensi": "Sedang",
      "confidence": 94
      }

    `;

    const aiResult = await model.generateContent([prompt, documentPart]);
    const cleanJson = aiResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);

    res.json({ success: true, data: parsedData });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memproses dokumen', message: error.message });
  }
});

// ✅ WAJIB UNTUK VERCEL: Export app agar bisa dibaca sebagai serverless function
module.exports = app;

// Tetap jalankan listen jika diakses di komputer lokal (development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`🚀 Backend lokal jalan di http://localhost:${PORT}`));
}