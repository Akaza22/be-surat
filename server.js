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
    Kamu adalah ARKASHA, asisten administrasi pintar.
    Tugasmu adalah membaca dokumen terlampir, mengekstrak informasinya, dan kembalikan HANYA dalam struktur JSON murni:
    - nomor_surat (String)
    - tanggal_surat (String)
    - pengirim (String)
    - perihal (String)
    - kategori_surat (String)
    - rekomendasi_unit (String)
    - urgensi (String)
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