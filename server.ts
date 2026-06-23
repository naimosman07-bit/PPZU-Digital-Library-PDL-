import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { PPZU_BOOKS } from "./src/data"; // Note: import with extension or relative typescript resolution

// Daily quote cache
let cachedQuote: {
  date: string;
  text: string;
  author: string;
  category: string;
  simulated?: boolean;
} | null = null;

const STATIC_QUOTES = [
  {
    text: "Pembangunan yang lestari bukan sekadar tentang membina mercu tanda, tetapi tentang meninggalkan warisan bumi yang seimbang dan mampan untuk generasi masa hadapan.",
    author: "Pintar AI Akmal • Pusat Sumber PPZU",
    category: "Perancangan Mampan"
  },
  {
    text: "Seni tertinggi dalam merancang perbandaran adalah meletakkan kesejahteraan jiwa rakyat di setiap sempadan garisan pelan pembangunan fizikal.",
    author: "Falsafah Perancangan Mampan • PLANMalaysia",
    category: "Kesejahteraan Komuniti"
  },
  {
    text: "Ketepatan dalam analisis spatial hari ini menghalang kekacauan pembangunan hari esok. Setiap titik data di peta adalah suara harapan komuniti.",
    author: "Akademik Geoinformasi",
    category: "Inovasi GIS"
  },
  {
    text: "Sinergi antara dasar perumahan yang mampan dengan integrasi zon hijau membentuk tamaddun perbandaran yang harmoni dan mesra alam.",
    author: "Inspirasi KPKT",
    category: "Integrasi Fizikal"
  },
  {
    text: "Merancang bandar bererti mendengar bisikan keperluan rakyat bawahan di samping merumuskan kemajuan infrastruktur bertaraf dunia.",
    author: "Perancang Fizikal Negara",
    category: "Sivil Awam Cemerlang"
  },
  {
    text: "Kecantikan sesebuah kota tidak terletak semata-mata pada seni bina fizikalnya, tetapi pada keharmonian komuniti yang menghidupkan ruang-ruang tersebut.",
    author: "Warisan PLANMalaysia",
    category: "Pembangunan Rakyat"
  },
  {
    text: "Urbanisasi pintar berjalan seiring dengan pemuliharaan khazanah alam sekitar. Melindungi KSAS (Kawasan Sensitif Alam Sekitar) adalah benteng kelangsungan generasi.",
    author: "Pintar AI Akmal",
    category: "Zon Sensitif Alam"
  }
];

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      // Missing or placeholder key, will fall back gracefully in route
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API route for the AI Librarian desk
app.post("/api/librarian", async (req, res) => {
  const { messages, selectedBook } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Sila hantar parameter 'messages' yang sah." });
  }

  // Format book catalog summary to feed to the AI system prompt
  const catalogContext = PPZU_BOOKS.map(b => 
    `- ID: ${b.id}, Tajuk: "${b.title}", Pengarang: ${b.author}, Kategori: ${b.category}, Jenis: ${b.type}, Lokasi: ${b.location}. Deskripsi: "${b.description}"`
  ).join("\n");

  const systemInstruction = `
    Anda adalah 'Akmal', Pembantu AI Perpustakaan Digital Pintar di Pusat Sumber Pejabat Projek Zon Utara (PPZU), PLANMalaysia (Jabatan Perancangan Bandar dan Desa) di bawah KPKT.
    Tugas anda adalah membantu kakitangan perancang dan pegawai teknikal PPZU mencari Garis Panduan Perancangan (GPP), Rancangan Struktur Negeri (RSN), Rancangan Tempatan Daerah (RTD), Rancangan Kawasan Khas (RKK), serta memahami data guna tanah, sistem maklumat geografi (GIS), dan dasar pembangunan fizikal sempadan utara (Perak, Kedah, Perlis, Pulau Pinang).
    
    Berikut adalah katalog buku dan dokumen perancangan terkini yang tersedia di Pusat Sumber PPZU:
    ${catalogContext}
    
    PERATURAN ANDA:
    1. Sentiasa jawab dengan nada bercakap profesional, sopan, mesra perbandaran, dan menggunakan Bahasa Melayu yang santun dan berpengetahuan tinggi (boleh campur istilah perancangan sekiranya perlu).
    2. Jika pengguna mencari rujukan perancangan, padankan dengan katalog di atas. Jika dokumen ADA, beritahu ID, Lokasi (contoh Rak L2 / Awan Digital), dan statusnya.
    3. Jika pengguna bertanya tentang dokumen yang TIADA dalam senarai, anda boleh mencadangkan rujukan terdekat daripada katalog kami yang berkaitan, ATAU berikan maklumat akademik am tentang tajuk di bawah kepakaran PLANMalaysia/KPKT, tetapi ingatkan mereka bahawa ia belum ditambah dalam arkib fizikal/digital PPZU sekarang.
    4. Sekiranya pengguna melampirkan konteks 'selectedBook', fokuskan perbualan kepada analisis laporan/dokumen tersebut. Sekiranya mereka minta ringkasan bab, berikan maklumat berkualiti tinggi dan berstruktur (cth: aspek pengezonan, densiti, KSAS / kawasan sensitif alam sekitar).
    5. Jangan sesekali menyebut tentang kod teknikal melainkan ID dokumen PPZU dan teras strategik.
  `;

  const client = getGeminiClient();

  if (!client) {
    // Graceful offline fallback when no API key is set
    const lastUserMsg = messages[messages.length - 1]?.text || "";
    let mockReply = "Maaf, kunci API Gemini belum dikonfigurasi di portal AI Studio. Namun, sebagai simulasi Akmal PPZU PLANMalaysia, saya boleh memaklumkan bahawa katalog kami mempunyai manual industri mampan seperti 'GPP Jilid 1: Garis Panduan Perancangan Perumahan (Edisi Ke-2)' di Awan Digital dan 'RKK Bandar Warisan Taiping' di Rak L2!";
    
    const lower = lastUserMsg.toLowerCase();
    if (lower.includes("gpp") || lower.includes("garis panduan")) {
      mockReply = "Untuk Garis Panduan Perancangan (GPP), siri terlaris kami adalah 'GPP Jilid 1: Garis Panduan Perancangan Perumahan (Edisi Ke-2)' (PPZU-G01) dan 'GPP Jilid 2: Kawasan Lapang & Rekreasi' (PPZU-G02). Anda boleh membaca isi kandungan Bab 1 & Bab 2 secara komprehensif terus di menu pembacaan digital dalam aplikasi ini!";
    } else if (lower.includes("rtd") || lower.includes("tempatan") || lower.includes("rancangan tempatan")) {
      mockReply = "Bagi Rancangan Tempatan Daerah, kami mempunyai warta 'Rancangan Tempatan Daerah Kubang Pasu 2035 (Warta)' (PPZU-L03) fizikalnya di Rak L2. Dokumen ini membincangkan zon sempadan khas SBEZ Bukit Kayu Hitam secara mendalam.";
    } else if (lower.includes("rsn") || lower.includes("struktur") || lower.includes("perak")) {
      mockReply = "Kami mempunyai laporan 'Rancangan Struktur Negeri Perak 2040 (Warta)' (PPZU-L02) di Rak L1 kedua-duanya fizikal dan digital. Ia sangat bagus untuk merujuk pelan pembangunan koridor Kinta dan zon lestari Taiping.";
    } else if (lower.includes("gis") || lower.includes("map") || lower.includes("guna tanah")) {
      mockReply = "Untuk pemetaan geoinformasi, anda wajib merujuk 'Buletin Perancangan PPZU: Pendigitalan GIS & Analisis Guna Tanah Pintar' (PPZU-B01) di Awan Digital PPZU. Ia mengandungi panduan aplikasi GIS i-Plan dan unjuran pemetaan paras air laut utara.";
    }

    return res.json({ text: mockReply, simulated: true });
  }

  try {
    // Map messages for Gemini
    // First message as general or build custom contents array
    const contents: any[] = [];
    
    // Support history conversation
    messages.forEach((msg: any) => {
      contents.push({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      });
    });

    // Append selectedBook context if relevant to provide rich context on the spot
    if (selectedBook) {
      contents[contents.length - 1].parts[0].text += `\n\n[Konteks Buku yang dipautkan: ${selectedBook.title} oleh ${selectedBook.author}. Kategori: ${selectedBook.category}. Deskripsi: ${selectedBook.description}]`;
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({ text: response.text || "Hubungi pentadbir, tiada respons daripada modul AI." });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "Sistem AI sedang sibuk. Sila cuba seketika lagi." });
  }
});

// Serve daily motivational quote / words of wisdom
app.get("/api/quote", async (req, res) => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // If caching matches, return cached
  if (cachedQuote && cachedQuote.date === today) {
    return res.json(cachedQuote);
  }

  // Fallback function to generate static quote based on date hash
  const getOfflineQuote = () => {
    const hash = today.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = Math.abs(hash) % STATIC_QUOTES.length;
    return {
      date: today,
      ...STATIC_QUOTES[index],
      simulated: true,
    };
  };

  const client = getGeminiClient();
  if (!client) {
    cachedQuote = getOfflineQuote();
    return res.json(cachedQuote);
  }

  try {
    const prompt = "Generate a highly inspiring, sophisticated daily motivational quote or word of wisdom (kata-kata hikmah) in Malay, focused on town planning, sustainable development, public service excellence, spatial design, community wellness, or housing mampan. It must target civil servants, municipal planners, or technical officers of PLANMalaysia and KPKT. It should be highly professional, elegant and beautiful.";

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional quote generation system for Malaysian town planners and civil servants. You must format your output strictly as a JSON object fitting the responseSchema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "The beautifully written quote or word of wisdom in high-quality Malay."
            },
            author: {
              type: Type.STRING,
              description: "The source or inspirational author's name, e.g. a classic figure or 'Pakar Perancang PLANMalaysia'."
            },
            category: {
              type: Type.STRING,
              description: "The category of the quote (e.g., 'Sinergi Spatial', 'Kemampanan Hijau')."
            }
          },
          required: ["text", "author", "category"]
        },
        temperature: 0.8,
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      cachedQuote = {
        date: today,
        text: parsed.text || "Terus berbakti membangun negeri.",
        author: parsed.author || "Pusat Sumber PPZU",
        category: parsed.category || "Motivasi Harian",
      };
      return res.json(cachedQuote);
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Error fetching AI daily quote:", error);
    // Silent failover to static list
    cachedQuote = getOfflineQuote();
    return res.json(cachedQuote);
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Configure Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Pusat Sumber PPZU] Server running on http://localhost:${PORT}`);
  });
}

startServer();
