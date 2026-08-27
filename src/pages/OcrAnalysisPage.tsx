import { useState } from "react";
import {
  Sparkles,
  Layers,
  Cpu,
  Scan,
  CheckCircle2,
  ArrowRight,
  Database,
  Shield,
  FileText,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Info,
  Search,
  Eye,
  Workflow,
  Compass,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
    title: "KTP Normal (Sedikit Noise)",
    description: "Teks KTP standar dengan noise tipis pada pemisah dan label titik dua.",
    badge: "Akurasi Tinggi",
    rawText: `PROVINSI SULAWESI TENGGARA
KABUPATEN MUNA
NIK : 7403140408020001
NAMA : LA ODE LUKMANA
TEMPAT/TGL LAHIR : RAHA, 04-08-2002
JENIS KELAMIN : LAKI-LAKI Gol. Darah : O
ALAMAT : JL. GAJAH MADA NO. 14
RT/RW : 002/001
KEL/DESA : DANA
KECAMATAN : WATOPUTE
AGAMA : ISLAM
STATUS PERKAWINAN : BELUM KAWIN
PEKERJAAN : PELAJAR/MAHASISWA
KEWARGANEGARAAN : WNI
BERLAKU HINGGA : SEUMUR HIDUP`,
  },
  {
    id: "case-2",
    title: "KTP dengan Karakter Typo & Lookalike OCR",
    description: "Karakter angka dan huruf tertukar akibat font OCR-B (misal: 'N1K', '0' di Gol Darah, 'ATAW' untuk RT/RW).",
    badge: "Uji Lookalike",
    rawText: `PROVINSI SULAWESI TENGGARA
KABUPATEN KOAKA
N1K : 74O3I4O4O8O2OOO1
N4MA : LA ODE LUKMANA
TEMPAT/TGI LAHIR : RAHA, 04-08-2002
JORUS KELAM1N : LAKI-LAKI Gol. Darah : 0
ALAMA! : JL. BYPASS KOLAKA
ATAW : OO3/OO1
KEI/DESA : DANA
KECAMATAN : WATOPUTE
AG4MA : ISLAM
STATUS PERKAW1NAN : BELUM KAWIN
PEKERJ44N : KARYAWAN SWASTA
WARGA NEGARA : WNI
BERLAKU : SEUMUR HIDUP`,
  },
  {
    id: "case-3",
    title: "KTP Golongan Darah Strip (-) & Kolom Tergabung",
    description: "Golongan darah tidak diketahui (-) dan label Jenis Kelamin menyatu dengan Gol Darah.",
    badge: "Uji Strip (-)",
    rawText: `PROV. JAWA BARAT
KOTA BANDUNG
NIK: 3273151205980004
NAMA: AHMAD HIDAYAT
TEMPAT TGL LAHIR: BANDUNG 12-05-1998
JENIS KELAMIN: LAKI-LAKI GOL. DARAH : -
ALAMAT: JL. ASIA AFRIKA NO. 88
RT/RW: 005/002
KELURAHAN/DESA: BRAGA
KECAMATAN: SUMUR BANDUNG
AGAMA: ISLAM
STATUS: KAWIN
PEKERJAAN: WIRASWASTA
KEWARGANEGARAAN: WNI
BERLAKU HINGGA: SEUMUR HIDUP`,
  },
];

export function OcrAnalysisPage() {
  const [selectedCase, setSelectedCase] = useState<SampleOcrCase>(SAMPLE_OCR_CASES[0]);
  const [customText, setCustomText] = useState(SAMPLE_OCR_CASES[0].rawText);
  const [parsedResult, setParsedResult] = useState(() => parseKtpText(SAMPLE_OCR_CASES[0].rawText));

  const handleSelectCase = (c: SampleOcrCase) => {
    setSelectedCase(c);
    setCustomText(c.rawText);
    setParsedResult(parseKtpText(c.rawText));
  };

  const handleRunParser = () => {
    setParsedResult(parseKtpText(customText));
  };

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

  const lookalikeRules = [
    { target: "NIK (Numerik)", input: "I, l, |, ], !, L", output: "1", note: "Font OCR-B sering menghasilkan garis vertikal tipis" },
    { target: "NIK (Numerik)", input: "O, o, D, Q, @", output: "0", note: "Bentuk oval tertutup sering dibaca huruf O atau D" },
    { target: "NIK (Numerik)", input: "Z, z", output: "2", note: "Lekukan angka 2 sering terbaca huruf Z" },
    { target: "NIK (Numerik)", input: "b, G, C", output: "6", note: "Lengkungan angka 6 menyerupai huruf b kecil" },
    { target: "NIK (Numerik)", input: "?, /, >, T", output: "7", note: "Garis miring angka 7 sering memicu simbol tanda tanya" },
    { target: "Golongan Darah", input: "0, Q, D, O", output: "O", note: "Angka nol pada golongan darah pasti merujuk ke tipe O" },
    { target: "Golongan Darah", input: "-, --, —, –", output: "-", note: "Tanda strip pada KTP resmi menunjukkan data belum terdata" },
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
            <Layers className="size-3.5" /> Tabel Lookalike
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

        {/* TAB 3: TABEL ATURAN LOOKALIKE & NORMALISASI */}
        <TabsContent value="rules" className="space-y-6">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Kamus Konversi Karakter Mirip (Lookalike Matrix)
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar aturan cerdas penanganan ambiguitas karakter optik antara huruf dan angka pada formulir identitas KTP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/40 font-mono">
                      <th className="p-2.5 font-semibold">Target Bidang</th>
                      <th className="p-2.5 font-semibold">Karakter OCR Masukan</th>
                      <th className="p-2.5 font-semibold">Hasil Normalisasi</th>
                      <th className="p-2.5 font-semibold">Alasan / Konteks Pemrosesan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {lookalikeRules.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
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
