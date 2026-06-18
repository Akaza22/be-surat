const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

// 1. Inisialisasi Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  // ✅ PERBAIKAN: Menggunakan versi 1.5 yang benar dan stabil
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

// Arahkan ke file gambar sampel dari klien
const lokasiGambar = path.join(__dirname, 'surat_tes-1.png'); 

async function prosesSuratOtomatis() {
  try {
    console.log("⏳ Langkah 1: Membaca teks dari gambar (OCR)...");
    
    // Proses OCR menggunakan Tesseract
    const { data: { text } } = await Tesseract.recognize(lokasiGambar, 'ind');
    
    console.log("✅ OCR Selesai!");
    console.log("⏳ Langkah 2: Menganalisis teks dengan Gemini AI...");

    // PROMPT ENGINEERING: ARKASHA Brief
    const prompt = `
    Kamu adalah sistem kecerdasan buatan untuk manajemen surat masuk.
    Tugasmu adalah menganalisis teks hasil OCR dari sebuah surat, mengekstrak informasi penting, dan menentukan klasifikasi unit tujuannya.
    
    Ekstrak data berikut dan kembalikan dalam struktur JSON murni yang valid:
    - nomor_surat (String)
    - tanggal (String, format YYYY-MM-DD jika tertera)
    - pengirim (String, ambil JABATAN dan NAMA ORANG yang menandatangani surat di bagian paling bawah. Contoh format: "Kepala Bagian Pelayanan Publik - Budi Santoso". JANGAN ambil nama instansi di kop surat)
    - perihal (String)
    - urgensi (String, pilih salah satu: "Tinggi", "Sedang", "Rendah")
    - unit_tujuan (String, ambil jabatan spesifik atau nama penerima yang tertulis di bagian "Kepada Yth." secara lengkap, jangan dipotong)

    Teks Hasil OCR:
    """
    ${text}
    """
    `;

    // Kirim teks hasil OCR ke Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // ✅ PERBAIKAN: Membersihkan markdown JSON (jika ada) sebelum di-parse
    const cleanJsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Parse hasil string JSON dari AI menjadi Object JavaScript
    const dataHasilEkstraksi = JSON.parse(cleanJsonString);

    console.log("\n=============================================");
    console.log("🎉 PROSES BERHASIL! DATA SIAP MASUK DATABASE:");
    console.log("=============================================\n");
    console.log(dataHasilEkstraksi);
    console.log("\n=============================================");
    
    // Nanti di LaporAja, kamu bisa integrasikan Prisma di sini:
    // await prisma.suratMasuk.create({ data: dataHasilEkstraksi });

  } catch (error) {
    console.error("❌ Terjadi kesalahan dalam pipeline AI:", error);
  }
}

// Jalankan pipeline
prosesSuratOtomatis();



