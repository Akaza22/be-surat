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
    Kamu adalah ARKASHA, sistem kecerdasan buatan untuk manajemen tata usaha dan persuratan di lingkungan Kepolisian.
    Tugas utamamu adalah menganalisis dokumen surat terlampir (gambar/PDF) dan mengekstrak datanya HANYA dalam bentuk JSON murni tanpa awalan/akhiran apapun (tanpa markdown).

    Gunakan format key dan patuhi batasan value berikut secara ketat:

    1. "nomor_surat": (String) Ekstrak nomor surat resmi. Jika tidak ditemukan, isi dengan null.
    2. "tanggal_surat": (String) Ekstrak tanggal surat dibuat atau ditandatangani. Jika tidak ada, isi dengan null.
    3. "pengirim": (String) Ekstrak instansi, pejabat, atau entitas utama yang mengirimkan surat (contoh: "Polda Jawa Timur", "Kapolrestabes Surabaya", atau "SMP Negeri 2 Sukadana").
    4. "perihal": (String) Ekstrak isi dari bagian 'Perihal', 'Hal', atau ringkasan tujuan utama surat.
    5. "lampiran": (String) Ekstrak informasi jumlah lampiran (contoh: "1 (satu) Berkas" atau "2 Lembar"). Jika tidak tertulis di dokumen, isi dengan "Tidak ada".
    6. "kategori_surat": (String) WAJIB pilih SATU dari daftar berikut berdasarkan konteks surat:
       - "Surat Masuk"
       - "Surat Keluar"
       - "Pengaduan"
       - "Permintaan Data"
       - "Undangan"
       - "Laporan"
    7. "rekomendasi_unit": (String) Analisis isi dan tujuan surat, lalu WAJIB pilih SATU unit disposisi yang paling relevan dari daftar ini:
       - "Humas" (Terkait publikasi, media, atau hubungan masyarakat)
       - "Reskrim" (Terkait tindak pidana, penyelidikan, laporan kejahatan, atau kehilangan)
       - "SDM" (Terkait mutasi, personel, pelatihan, atau absensi)
       - "Logistik" (Terkait kendaraan, senjata, perlengkapan, atau aset)
       - "Keuangan" (Terkait anggaran, DIPA, pencairan dana, atau gaji)
    8. "urgensi": (String) Evaluasi tingkat prioritas surat dan WAJIB pilih SATU dari daftar berikut:
       - "Tinggi" (Ada label 'SANGAT SEGERA', 'Kilat', tenggat waktu sangat mepet, atau terkait atensi/tindak pidana)
       - "Sedang" (Ada tenggat waktu standar/normal)
       - "Rendah" (Surat biasa/BIASA, pemberitahuan umum, tidak ada tenggat waktu khusus)

    Berikan output HANYA berupa objek JSON yang valid dan siap di-parse oleh JSON.parse().
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