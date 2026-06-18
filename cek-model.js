require('dotenv').config();

async function cekDaftarModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    console.log("⏳ Menghubungi server Google untuk mengecek model yang tersedia...");
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Terjadi error dari API Key:", data.error.message);
      return;
    }

    console.log("\n✅ DAFTAR MODEL YANG BISA KAMU PAKAI:");
    console.log("=========================================");
    
    // Kita filter hanya model yang mendukung fitur "generateContent" (teks)
    const modelBisaTeks = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
    
    modelBisaTeks.forEach(m => {
      console.log(`- Nama Model : "${m.name.replace('models/', '')}"`);
      console.log(`  Deskripsi  : ${m.displayName}`);
      console.log("-----------------------------------------");
    });

  } catch (error) {
    console.error("❌ Gagal terhubung:", error);
  }
}

cekDaftarModel();