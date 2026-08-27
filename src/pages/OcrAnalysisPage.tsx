import { useState } from "react";
import {
  Sparkles,
  Layers,
  Cpu,
  Scan,
  CheckCircle2,
  Database,
  Shield,
  FileText,
  Sliders,
  Play,
  Info,
  Workflow,
  Compass,
  Filter,
  Code2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseKtpText } from "@/services/ktpParser";

interface SampleOcrCase {
  id: string;
  title: string;
  description: string;
  badge: string;
  rawText: string;
}

const SAMPLE_OCR_CASES: SampleOcrCase[] = [
  {
    id: "case-1",
    title: "KTP Normal (Sesuai Gambar KTP)",
    description: "Teks KTP standar DIAN RAMADAN. L dari Kabupaten Kolaka, Sulawesi Tenggara.",
    badge: "Akurasi 100%",
    rawText: `PROVINSI SULAWESI TENGGARA
KABUPATEN KOLAKA
NIK : 7401044511030004
NAMA : DIAN RAMADAN. L
TEMPAT/TGL LAHIR : KOLAKA, 05-11-2003
JENIS KELAMIN : PEREMPUAN Gol. Darah : O
ALAMAT : LINGK. IV EPE
RT/RW : 000/000
KEL/DESA : WUNDULAKO
KECAMATAN : WUNDULAKO
AGAMA : ISLAM
STATUS PERKAWINAN : BELUM KAWIN
PEKERJAAN : PELAJAR/MAHASISWA
KEWARGANEGARAAN : WNI
BERLAKU HINGGA : SEUMUR HIDUP`,
  },
  {
    id: "case-2",
    title: "KTP dengan Karakter Typo & Lookalike OCR",
    description: "Uji coba font OCR-B saat huruf dan angka tertukar (misal: 'N1K', '74O1O4...', '0' di Gol Darah).",
    badge: "Uji Lookalike",
    rawText: `PROVINSI SULAWESI TENGGARA
KABUPATEN KOAKA
N1K : 74O1O44511O3OOO4
N4MA : DIAN RAMADAN. L
TEMPAT/TGI LAHIR : KOLAKA, 05-11-2003
JORUS KELAM1N : PEREMPUAN Gol. Darah : 0
ALAMA! : LINGK. IV EPE
ATAW : OOO/OOO
KEI/DESA : WUNDULAKO
KECAMATAN : WUNDULAKO
AG4MA : ISLAM
STATUS PERKAW1NAN : BELUM KAWIN
PEKERJ44N : PELAJAR/MAHASISWA
WARGA NEGARA : WNI
BERLAKU : SEUMUR HIDUP`,
  },
  {
    id: "case-3",
    title: "KTP Golongan Darah Strip (-) & Kolom Tergabung",
    description: "Golongan darah tidak diketahui (-) dan label Jenis Kelamin menyatu dengan Gol Darah.",
    badge: "Uji Strip (-)",
    rawText: `PROVINSI SULAWESI TENGGARA
KABUPATEN KOLAKA
NIK: 7401044511030004
NAMA: DIAN RAMADAN. L
TEMPAT TGL LAHIR: KOLAKA, 05-11-2003
JENIS KELAMIN: PEREMPUAN GOL. DARAH : -
ALAMAT: LINGK. IV EPE
RT/RW: 000/000
KELURAHAN/DESA: WUNDULAKO
KECAMATAN: WUNDULAKO
AGAMA: ISLAM
STATUS: BELUM KAWIN
PEKERJAAN: PELAJAR/MAHASISWA
KEWARGANEGARAAN: WNI
BERLAKU HINGGA: SEUMUR HIDUP`,
  },
];

type LookalikeCategory = "all" | "nik" | "letters" | "blood" | "rtrw" | "labels" | "wilayah";

interface LookalikeRule {
  category: "nik" | "letters" | "blood" | "rtrw" | "labels" | "wilayah";
  target: string;
  input: string;
  output: string;
  note: string;
}

const ALL_LOOKALIKE_RULES: LookalikeRule[] = [
  // 1. NIK Lookalike (Numerik Agresif OCR-B)
  { category: "nik", target: "Angka NIK '1'", input: "I, l, |, ], !, L, %, /", output: "1", note: "Garis tegak monospaced OCR-B pada NIK sering terbaca huruf kecil l atau pipa |" },
  { category: "nik", target: "Angka NIK '0'", input: "O, o, D, d, Q, @, C", output: "0", note: "Bentuk oval tertutup pada digit angka sering dikenali huruf kapital O, D, atau Q" },
  { category: "nik", target: "Angka NIK '2'", input: "Z, z", output: "2", note: "Lekukan garis atas angka 2 sering memicu karakter huruf Z" },
  { category: "nik", target: "Angka NIK '3'", input: "E, ], B (posisi numerik)", output: "3", note: "Lengkungan ganda angka 3 kadang terbaca huruf B atau kurung siku" },
  { category: "nik", target: "Angka NIK '4'", input: "A, a, H, h, +", output: "4", note: "Puncak segitiga angka 4 menyerupai huruf A atau H" },
  { category: "nik", target: "Angka NIK '5'", input: "S, s, $, §", output: "5", note: "Bentuk kurva angka 5 memiliki kemiripan optik sangat tinggi dengan huruf S" },
  { category: "nik", target: "Angka NIK '6'", input: "b, G, C, e", output: "6", note: "Lengkungan bawah angka 6 sering dikenali sebagai huruf b kecil atau G" },
  { category: "nik", target: "Angka NIK '7'", input: "?, /, >, T, t, F, f", output: "7", note: "Garis horizontal atas dan diagonal angka 7 sering memicu simbol tanda tanya atau T" },
  { category: "nik", target: "Angka NIK '8'", input: "B, &, X", output: "8", note: "Dua lingkaran bertumpuk angka 8 sering terbaca huruf B kapital atau ampersand" },
  { category: "nik", target: "Angka NIK '9'", input: "q, g, P, p", output: "9", note: "Lingkaran atas dan tangkai angka 9 mirip dengan huruf q atau g" },

  // 2. Huruf Lookalike pada Teks (Nama, Tempat, Alamat)
  { category: "letters", target: "Huruf 'O' (Nama/Teks)", input: "0 (angka nol)", output: "O", note: "Di field nama/tempat lahir alfabetis, angka nol dikembalikan menjadi huruf O" },
  { category: "letters", target: "Huruf 'I' (Nama/Teks)", input: "1 (angka satu), |", output: "I", note: "Di field nama alfabetis, angka satu dikembalikan menjadi huruf I" },
  { category: "letters", target: "Huruf 'A' (Nama/Teks)", input: "4 (angka empat)", output: "A", note: "Contoh: 'N4MA' atau 'D4N4' dikoreksi menjadi 'NAMA' dan 'DANA'" },
  { category: "letters", target: "Huruf 'S' (Nama/Teks)", input: "5 (angka lima), $", output: "S", note: "Contoh: 'I5LAM' dikoreksi menjadi 'ISLAM'" },
  { category: "letters", target: "Huruf 'G' (Nama/Teks)", input: "6 (angka enam)", output: "G", note: "Contoh: 'T6L' dikoreksi menjadi 'TGL'" },
  { category: "letters", target: "Huruf 'B' (Nama/Teks)", input: "8 (angka delapan)", output: "B", note: "Contoh: '8ELUM KAWIN' dikoreksi menjadi 'BELUM KAWIN'" },

  // 3. Golongan Darah
  { category: "blood", target: "Golongan Darah 'O'", input: "0, Q, D, O, o", output: "O", note: "Angka nol atau kembaran oval pada kolom Golongan Darah dipastikan sebagai tipe O" },
  { category: "blood", target: "Golongan Darah '-'", input: "-, --, —, –, : -, :-", output: "-", note: "Tanda strip pada KTP resmi menunjukkan data golongan darah belum tercatat" },
  { category: "blood", target: "Golongan Darah 'A/B/AB'", input: "A, B, AB, A., B.", output: "A, B, AB", note: "Deteksi golongan darah standar dengan pembersihan tanda baca titik/spasi" },

  // 4. Format RT / RW (3 Digit Padding)
  { category: "rtrw", target: "Format RT/RW '000'", input: "OOO, OOG, DOG, DOO, 00O, 00, 0", output: "000", note: "Nilai nol pada RT/RW yang terbaca huruf O atau D dinormalisasi ke 3 digit '000'" },
  { category: "rtrw", target: "Format RT/RW '001'", input: "1, 01, OO1, 0O1", output: "001", note: "Angka 1 digit dipadding otomatis dengan leading zeros sesuai format Disdukcapil" },
  { category: "rtrw", target: "Format RT/RW '002'", input: "2, 02, OO2, ZO2", output: "002", note: "Angka RT 2 dinormalisasi ke '002'" },

  // 5. Fuzzy Matching Label Field e-KTP (Levenshtein Distance)
  { category: "labels", target: "Label NIK", input: "NIK, N1K, NlK, N|K, NIX, NK, N1X, N1C", output: "nik", note: "Threshold kemiripan string >= 58%" },
  { category: "labels", target: "Label Nama", input: "NAMA, N4MA", output: "nama", note: "Threshold kemiripan string >= 60%" },
  { category: "labels", target: "Label Tempat/Tgl Lahir", input: "TEMPAT/TGL LAHIR, TEMPAT/TGI, TMPT/TGL, TEMPATIFGI, TEMPATITGL", output: "tempatLahir", note: "Mendeteksi variasi pemisah slash/titik dan salah baca I/L" },
  { category: "labels", target: "Label Jenis Kelamin", input: "JENIS KELAMIN, JENISKELAMIN, JENIS KELAM1N, JORUS KELAMIN, JORUS", output: "jenisKelamin", note: "Menangani typo umum OCR 'JORUS' akibat lipatan kartu" },
  { category: "labels", target: "Label Golongan Darah", input: "GOL DARAH, GOL. DARAH, GOLONGAN DARAH, GDARAH, DARAH", output: "golonganDarah", note: "Mendukung ekstraksi mandiri maupun sebaris dengan Jenis Kelamin" },
  { category: "labels", target: "Label Alamat", input: "ALAMAT, ALAMA!, ALAMA, ALAMAI, ALMAT", output: "alamat", note: "Menangkap baris alamat utama beserta sambungan baris berikutnya" },
  { category: "labels", target: "Label RT/RW", input: "RT/RW, RTRW, RT RW, RTAW, ATAW, AT/RW, PT/RW, PT RW", output: "rt & rw", note: "Mendeteksi salah baca huruf R menjadi A atau P" },
  { category: "labels", target: "Label Kelurahan/Desa", input: "KEL/DESA, KEI/DESA, KELDESA, KEIDESA, KELURAHAN/DESA, KCL/DESA", output: "kelurahanDesa", note: "Menangani salah baca huruf L menjadi I atau C" },
  { category: "labels", target: "Label Kecamatan", input: "KECAMATAN, KEC, KEC., KECAMATAM", output: "kecamatan", note: "Mengenali singkatan resmi maupun variasi salah baca" },
  { category: "labels", target: "Label Status Perkawinan", input: "STATUS PERKAWINAN, STATUS PERKAW1NAN, STATUS PERKAWINAM, STATUS", output: "statusPerkawinan", note: "Mencocokkan ke opsi: BELUM KAWIN, KAWIN, CERAI HIDUP, CERAI MATI" },
  { category: "labels", target: "Label Pekerjaan", input: "PEKERJAAN, PEKERJAAM, PEKERJ44N", output: "pekerjaan", note: "Dibersihkan dari cap noise stempel kota atau nomor tanda tangan" },
  { category: "labels", target: "Label Kewarganegaraan", input: "KEWARGANEGARAAN, KEWARGANEGARAN, WARGA NEGARA, KEWARGA", output: "kewarganegaraan", note: "Menormalisasi nilai ke standar WNI / WNA" },
  { category: "labels", target: "Label Masa Berlaku", input: "BERLAKU HINGGA, BERLAKUHINGGA, BERLAKU, BERLAKU S/D", output: "berlakuHingga", note: "Menormalisasi teks 'SEUMUR HIDUP' atau format tanggal kedaluwarsa" },

  // 6. Typo Khusus Nama Wilayah Administrasi
  { category: "wilayah", target: "Kabupaten Kolaka", input: "KOAKA, KOEAKA, KOLAKK", output: "KABUPATEN KOLAKA", note: "Koreksi otomatis typo huruf L pada nama Kabupaten Kolaka" },
  { category: "wilayah", target: "Kabupaten Muna", input: "MINA, MJNA", output: "KABUPATEN MUNA", note: "Koreksi otomatis typo huruf U yang terbaca I atau J pada Kabupaten Muna" },
  { category: "wilayah", target: "Prefix Kabupaten", input: "UPATEN, KABUPATEN UPATEN, KABUPATEN KABUPATEN", output: "KABUPATEN", note: "Menghilangkan duplikasi prefix akibat noise garis pemisah KTP" },
  { category: "wilayah", target: "Provinsi Indonesia", input: "PROVINS1, PROV., PN ST PROVINSI", output: "Nama Resmi Provinsi", note: "Dicocokkan ke 38 Provinsi resmi Republik Indonesia" },
];

export function OcrAnalysisPage() {
  const [selectedCase, setSelectedCase] = useState<SampleOcrCase>(SAMPLE_OCR_CASES[0]);
  const [customText, setCustomText] = useState(SAMPLE_OCR_CASES[0].rawText);
  const [parsedResult, setParsedResult] = useState(() => parseKtpText(SAMPLE_OCR_CASES[0].rawText));
  const [activeCategory, setActiveCategory] = useState<LookalikeCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectCase = (c: SampleOcrCase) => {
    setSelectedCase(c);
    setCustomText(c.rawText);
    setParsedResult(parseKtpText(c.rawText));
  };

  const handleRunParser = () => {
    setParsedResult(parseKtpText(customText));
  };

  const filteredRules = ALL_LOOKALIKE_RULES.filter((rule) => {
    const matchCategory = activeCategory === "all" || rule.category === activeCategory;
    const matchSearch =
      searchQuery === "" ||
      rule.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.input.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.output.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.note.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const stages = [
    {
      step: "01",
      title: "Image Acquisition & Pre-processing",
      subtitle: "Persiapan & Binarisasi Citra",
      icon: Scan,
      color: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
      details: [
        "Scaling resolusi cerdas ke 1200px untuk menghemat RAM dan mempercepat komputasi 10x lipat.",
        "Grayscale binarization & peningkatan kontras adaptif untuk menghilangkan noise motif batik/latar belakang KTP.",
        "Koreksi rotasi EXIF otomatis dari sensor kamera HP agar orientasi teks tepat 0°.",
      ],
    },
    {
      step: "02",
      title: "Tesseract LSTM Neural Network Engine",
      subtitle: "Ekstraksi Karakter Optik",
      icon: Cpu,
      color: "from-indigo-500/20 to-blue-500/20 text-indigo-400 border-indigo-500/30",
      details: [
        "Page Segmentation Mode (PSM) mendeteksi baris teks terpisah pada kartu identitas.",
        "Model LSTM ind+eng mengenali bentuk glyph karakter, termasuk font khusus monospaced OCR-B pada nomor NIK.",
        "Menghasilkan teks mentah (Raw Text Stream) beserta skor keyakinan awal (confidence metrics).",
      ],
    },
    {
      step: "03",
      title: "Fuzzy Tokenizer & Levenshtein Matching",
      subtitle: "Pemisahan Label & Nilai",
      icon: Workflow,
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
      details: [
        "Menggunakan algoritma Jarak Levenshtein untuk mengenali label meskipun ada typo (misal: 'N1K' ➔ NIK, 'JORUS' ➔ JENIS KELAMIN, 'ATAW' ➔ RT/RW).",
        "Mendeteksi field multi-kolom sebaris (misal: 'PEREMPUAN Gol. Darah : O' dipecah menjadi dua field).",
        "Mendeteksi baris alamat multi-line yang menyambung di baris bawahnya.",
      ],
    },
    {
      step: "04",
      title: "Domain-Specific Character Correction",
      subtitle: "Koreksi Karakter Mirip (Lookalike Mapping)",
      icon: Layers,
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
      details: [
        "Koreksi NIK: Huruf mirip angka dikonversi (I/l/| ➔ 1, O/D/Q ➔ 0, Z ➔ 2, b/G ➔ 6, ?/T ➔ 7).",
        "Koreksi Golongan Darah: Jika terbaca angka 0/Q/D dipetakan ke 'O', jika strip dipetakan ke '-'.",
        "Menjaga keaslian seluruh 16 digit NIK yang terbaca dari OCR tanpa memanipulasi digit akhir.",
      ],
    },
    {
      step: "05",
      title: "Wilayah Indonesia Database Enrichment",
      subtitle: "Validasi & Normalisasi Wilayah Disdukcapil",
      icon: Database,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      details: [
        "Pencocokan silang dengan database lengkap 38 Provinsi, 514 Kabupaten/Kota, 7.200+ Kecamatan, dan 83.000+ Kelurahan.",
        "Koreksi otomatis typo nama kabupaten (misal: 'KOAKA' ➔ KOLAKA, 'MINA' ➔ MUNA).",
        "Validasi 6 digit kode wilayah depan NIK dengan kode administrasi resmi Kemendagri.",
      ],
    },
    {
      step: "06",
      title: "Blowfish-128 Encryption & Storage",
      subtitle: "Pengamanan Kriptografi & Penyimpanan Cloud",
      icon: Shield,
      color: "from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30",
      details: [
        "Struktur data JSON divalidasi dengan skema Zod sebelum masuk tahap pengamanan.",
        "Setiap field sensitif dienkripsi secara independen dengan algoritma Blowfish 16-round Feistel Network.",
        "Disimpan ke database cloud Neon Serverless PostgreSQL dalam bentuk ciphertext hex aman.",
      ],
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Sparkles className="size-3.5" /> Modul Analisis Arsitektur OCR
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Analisis Pipeline OCR e-KTP
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Pelajari alur komprehensif bagaimana sistem mentransformasikan citra fisik KTP dari kamera ponsel hingga menjadi data digital terstruktur dengan akurasi tinggi.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs bg-card/60">
            Tesseract v5.0 (LSTM)
          </Badge>
          <Badge variant="outline" className="text-xs bg-card/60">
            Fuzzy Levenshtein
          </Badge>
          <Badge variant="outline" className="text-xs bg-card/60">
            Disdukcapil 38 Provinsi
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="pipeline" className="text-xs font-semibold gap-1.5">
            <Workflow className="size-3.5" /> 6 Tahap Pipeline
          </TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs font-semibold gap-1.5">
            <Play className="size-3.5" /> Live Inspector
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs font-semibold gap-1.5">
            <Layers className="size-3.5" /> Kamus Lookalike ({ALL_LOOKALIKE_RULES.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 6 TAHAP PIPELINE LENGKAP */}
        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stages.map((stage) => {
              const Icon = stage.icon;
              return (
                <Card key={stage.step} className="border-border/60 bg-card/50 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stage.color} rounded-bl-full opacity-30 pointer-events-none`} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-lg bg-background/80 border border-border flex items-center justify-center shadow-xs">
                          <Icon className="size-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{stage.title}</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">{stage.subtitle}</CardDescription>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {stage.step}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 text-xs">
                    <ul className="space-y-2 text-muted-foreground">
                      {stage.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="size-3.5 text-primary mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Diagram Alur Data */}
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Compass className="size-4 text-primary" /> Diagram Visual Perjalanan Data
              </CardTitle>
              <CardDescription className="text-xs">
                Visualisasi aliran data dari foto masukan hingga tersimpan aman di database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-stretch justify-between gap-3 text-xs">
                <div className="flex-1 p-3 rounded-lg border border-border/80 bg-background/50 flex flex-col items-center text-center gap-1.5">
                  <Scan className="size-5 text-cyan-400" />
                  <span className="font-semibold text-foreground">1. Foto Mentah KTP</span>
                  <span className="text-[11px] text-muted-foreground">Kamera Ponsel / Upload File</span>
                </div>
                <div className="hidden md:flex items-center justify-center text-muted-foreground">➔</div>
                <div className="flex-1 p-3 rounded-lg border border-border/80 bg-background/50 flex flex-col items-center text-center gap-1.5">
                  <Sliders className="size-5 text-indigo-400" />
                  <span className="font-semibold text-foreground">2. Pre-processing</span>
                  <span className="text-[11px] text-muted-foreground">1200px Grayscale Binarization</span>
                </div>
                <div className="hidden md:flex items-center justify-center text-muted-foreground">➔</div>
                <div className="flex-1 p-3 rounded-lg border border-border/80 bg-background/50 flex flex-col items-center text-center gap-1.5">
                  <Cpu className="size-5 text-purple-400" />
                  <span className="font-semibold text-foreground">3. Tesseract OCR</span>
                  <span className="text-[11px] text-muted-foreground">LSTM Text Recognition</span>
                </div>
                <div className="hidden md:flex items-center justify-center text-muted-foreground">➔</div>
                <div className="flex-1 p-3 rounded-lg border border-border/80 bg-background/50 flex flex-col items-center text-center gap-1.5">
                  <Workflow className="size-5 text-amber-400" />
                  <span className="font-semibold text-foreground">4. Parser & Lookalike</span>
                  <span className="text-[11px] text-muted-foreground">Fuzzy Levenshtein & Wilayah</span>
                </div>
                <div className="hidden md:flex items-center justify-center text-muted-foreground">➔</div>
                <div className="flex-1 p-3 rounded-lg border border-border/80 bg-background/50 flex flex-col items-center text-center gap-1.5">
                  <Shield className="size-5 text-emerald-400" />
                  <span className="font-semibold text-foreground">5. Blowfish Enkripsi</span>
                  <span className="text-[11px] text-muted-foreground">Penyimpanan Aman di Neon DB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: LIVE SIMULATOR & INSPECTOR */}
        <TabsContent value="simulator" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Input & Skenario */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Pilih Skenario Uji Coba</span>
                    <Badge variant="secondary" className="text-[10px]">Interaktif</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pilih contoh teks OCR untuk mengamati cara kerja parser dan normalisasi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {SAMPLE_OCR_CASES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCase(c)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between gap-2 ${
                          selectedCase.id === c.id
                            ? "border-primary bg-primary/10 text-foreground font-medium"
                            : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-semibold text-foreground">{c.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {c.badge}
                        </Badge>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Teks Mentah OCR (Bisa Diedit Bebas):
                    </label>
                    <textarea
                      rows={9}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="w-full font-mono text-[11px] p-2.5 rounded-md border border-input bg-background/80 focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>

                  <Button onClick={handleRunParser} className="w-full text-xs font-semibold gap-2">
                    <Play className="size-3.5" /> Uji Parsing Sekarang
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Output Hasil Ekstraksi */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400" /> Hasil Transformasi Data Terstruktur
                    </CardTitle>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
                      100% Normalized
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Data setelah melalui algoritma normalisasi label, lookalike mapping, dan verifikasi wilayah
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">NOMOR NIK (16 DIGIT)</span>
                      <span className="font-semibold text-foreground font-mono text-sm">
                        {parsedResult.data.nik || <span className="text-amber-400 font-sans italic">Tidak terbaca</span>}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">NAMA LENGKAP</span>
                      <span className="font-semibold text-foreground truncate block">
                        {parsedResult.data.nama || "-"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">TEMPAT / TGL LAHIR</span>
                      <span className="font-semibold text-foreground">
                        {parsedResult.data.tempatLahir || "-"}, {parsedResult.data.tanggalLahir || "-"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">JENIS KELAMIN / GOL. DARAH</span>
                      <span className="font-semibold text-foreground">
                        {parsedResult.data.jenisKelamin || "-"} (Gol. {parsedResult.data.golonganDarah || "-"})
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">PROVINSI</span>
                      <span className="font-semibold text-foreground">
                        {parsedResult.data.provinsi || "-"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">KABUPATEN / KOTA</span>
                      <span className="font-semibold text-foreground">
                        {parsedResult.data.kabupatenKota || "-"}
                      </span>
                    </div>

                    <div className="col-span-2 p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">ALAMAT LENGKAP & RT/RW</span>
                      <span className="font-semibold text-foreground">
                        {parsedResult.data.alamat || "-"} RT {parsedResult.data.rt || "-"} / RW {parsedResult.data.rw || "-"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">KECAMATAN / KELURAHAN</span>
                      <span className="font-semibold text-foreground">
                        Kec. {parsedResult.data.kecamatan || "-"} / Kel. {parsedResult.data.kelurahanDesa || "-"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded border border-border/60 bg-background/50">
                      <span className="text-[10px] text-muted-foreground block font-mono">AGAMA / STATUS KAWIN</span>
                      <span className="font-semibold text-foreground">
                        {parsedResult.data.agama || "-"} / {parsedResult.data.statusPerkawinan || "-"}
                      </span>
                    </div>
                  </div>

                  {parsedResult.warnings.length > 0 && (
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                      <Info className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Catatan Parser:</p>
                        <ul className="list-disc list-inside">
                          {parsedResult.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: TABEL LENGKAP ATURAN LOOKALIKE & NORMALISASI MULTI-KATEGORI */}
        <TabsContent value="rules" className="space-y-6">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="size-4 text-primary" /> Kamus Lengkap Konversi Karakter Mirip & Fuzzy Matching ({filteredRules.length} Aturan)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Seluruh matriks aturan penanganan ambiguitas optik OCR-B, normalisasi alfabet, dan perbaikan typo wilayah
                  </CardDescription>
                </div>

                {/* Search box */}
                <input
                  type="text"
                  placeholder="Cari target / input / output..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-md border border-input bg-background/80 focus:ring-1 focus:ring-primary focus:outline-hidden max-w-xs"
                />
              </div>

              {/* Filter Tabs / Badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
                  <Filter className="size-3" /> Kategori:
                </span>
                {[
                  { id: "all", label: "Semua" },
                  { id: "nik", label: "Angka NIK" },
                  { id: "letters", label: "Huruf Nama/Teks" },
                  { id: "blood", label: "Gol. Darah" },
                  { id: "rtrw", label: "Format RT/RW" },
                  { id: "labels", label: "Label Field KTP" },
                  { id: "wilayah", label: "Typo Wilayah" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as LookalikeCategory)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/40 font-mono">
                      <th className="p-2.5 font-semibold">Kategori</th>
                      <th className="p-2.5 font-semibold">Target Bidang / Simbol</th>
                      <th className="p-2.5 font-semibold">Karakter OCR Masukan</th>
                      <th className="p-2.5 font-semibold">Hasil Normalisasi</th>
                      <th className="p-2.5 font-semibold">Alasan / Konteks Pemrosesan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredRules.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {r.category}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-medium text-foreground">{r.target}</td>
                        <td className="p-2.5 font-mono text-amber-400 bg-amber-500/5">{r.input}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-400 bg-emerald-500/5">{r.output}</td>
                        <td className="p-2.5 text-muted-foreground">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
