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
    Kamu adalah ARKASHA, asisten AI pintar untuk manajemen dokumen di lingkungan Kepolisian.
    Tugasmu adalah membaca dokumen terlampir, menganalisis isinya, dan mengekstrak informasi ke dalam format JSON murni. 
    Kamu TIDAK BOLEH menambahkan teks apa pun selain JSON.

    Gunakan format key dan patuhi batasan value berikut secara ketat:
    
    1. "nomor_surat": (String) Ekstrak nomor surat resmi. Jika tidak ada, isi dengan null.
    2. "tanggal_surat": (String) Ekstrak tanggal pembuatan surat.
    3. "pengirim": (String) Ekstrak entitas, instansi, atau pejabat pengirim surat.
    4. "perihal": (String) Ekstrak isi bagian 'Perihal', 'Hal', atau ringkasan tujuan surat.
    5. "kategori_surat": (String) WAJIB pilih SATU dari daftar ini berdasarkan konteks surat:
       - "Surat Masuk"
       - "Surat Keluar"
       - "Pengaduan"
       - "Permintaan Data"
       - "Undangan"
       - "Laporan"
    6. "rekomendasi_unit": (String) Analisis isi dan tujuan surat, lalu WAJIB pilih SATU unit disposisi yang paling relevan dari daftar ini:
       - "Humas" (Terkait publikasi, media, masyarakat)
       - "Reskrim" (Terkait tindak pidana, penyelidikan, laporan kejahatan)
       - "SDM" (Terkait mutasi, personel, pelatihan, absensi)
       - "Logistik" (Terkait kendaraan, senjata, perlengkapan, aset)
       - "Keuangan" (Terkait anggaran, DIPA, pencairan dana, gaji)
    7. "urgensi": (String) Evaluasi tingkat prioritas surat dan WAJIB pilih SATU dari daftar ini:
       - "Tinggi" (Ada kata 'Segera', 'Kilat', tenggat waktu sangat mepet, atau terkait atensi pimpinan)
       - "Sedang" (Ada tenggat waktu standar)
       - "Rendah" (Surat biasa, pemberitahuan umum, tidak ada tenggat waktu khusus)

    Berikan output HANYA dalam bentuk JSON yang valid.
    
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