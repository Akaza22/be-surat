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
const lokasiGambar = path.join(__dirname, 'surat2.png'); 

async function prosesSuratOtomatis() {
  try {
    console.log("⏳ Langkah 1: Membaca teks dari gambar (OCR)...");
    
    // Proses OCR menggunakan Tesseract
    const { data: { text } } = await Tesseract.recognize(lokasiGambar, 'ind');
    
    console.log("✅ OCR Selesai!");
    console.log("⏳ Langkah 2: Menganalisis teks dengan Gemini AI...");

    // PROMPT ENGINEERING: ARKASHA Brief
    const prompt = `
    Kamu adalah ARKASHA, asisten administrasi pintar untuk manajemen surat di instansi kepolisian (Polda).
    Tugasmu adalah menganalisis teks hasil OCR dari sebuah surat, mengekstrak informasi penting, dan memberikan klasifikasi serta rekomendasi disposisi.
    
    Ekstrak data berikut dan kembalikan HANYA dalam struktur JSON murni yang valid:
    - nomor_surat (String, ambil dari bagian Nomor)
    - tanggal_surat (String, ambil tanggal pembuatan surat di pojok kanan atas atau bagian bawah)
    - pengirim (String, ambil jabatan/nama yang menandatangani di bagian paling bawah surat)
    - instansi (String, ambil nama instansi utama pada kop surat paling atas)
    - perihal (String)
    - lampiran (String, isi dengan "-" jika tidak ada)
    - kata_kunci (Array of String, berikan 3-5 kata penting yang mewakili isi surat)
    - kategori_surat (String, WAJIB pilih salah satu yang paling cocok: "Surat Masuk", "Surat Keluar", "Pengaduan", "Permintaan Data", "Undangan", atau "Laporan")
    - rekomendasi_unit (String, berikan unit tujuan yang relevan berdasarkan isi, contoh: "Humas", "Reskrim", "SDM", "Logistik", "Keuangan", "Roops", atau unit kepolisian lainnya)
    - urgensi (String, WAJIB pilih salah satu: "Tinggi", "Sedang", "Rendah". Jika di surat ada tulisan Klasifikasi: Biasa, jadikan "Rendah" atau "Sedang")

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