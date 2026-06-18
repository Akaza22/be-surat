const Tesseract = require('tesseract.js');
const path = require('path');

// Arahkan ke file gambar contoh yang sudah kamu siapkan
const lokasiGambar = path.join(__dirname, 'surat_tes-1.png'); 

console.log("⏳ Menyiapkan Engine OCR...");

Tesseract.recognize(
  lokasiGambar,
  'ind', // Menggunakan bahasa Indonesia
  { 
    // Logger ini berfungsi untuk menampilkan progress di terminal
    logger: info => {
      if (info.status === 'recognizing text') {
        console.log(`🔄 Sedang membaca teks: ${Math.floor(info.progress * 100)}%`);
      } else {
        console.log(`📦 Status: ${info.status}`);
      }
    }
  }
)
.then(({ data: { text } }) => {
  console.log("\n=============================================");
  console.log("✅ TES SELESAI! BERIKUT HASIL TEKS DARI GAMBAR:");
  console.log("=============================================\n");
  console.log(text);
  console.log("\n=============================================");
})
.catch(err => {
  console.error("❌ Terjadi kesalahan saat membaca gambar:", err);
});