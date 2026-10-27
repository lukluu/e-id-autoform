import { useState } from "react";
import {
  Layers,
  Cpu,
  Scan,
  CheckCircle2,
  Database,
  Shield,
  Sliders,
  Play,
  Info,
  Workflow,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
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
  const firstCase = SAMPLE_OCR_CASES[0]!;
  const [selectedCase, setSelectedCase] = useState<SampleOcrCase>(firstCase);
  const [customText, setCustomText] = useState(firstCase.rawText);
  const [parsedResult, setParsedResult] = useState(() => parseKtpText(firstCase.rawText));
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
      details: [
        "Pencocokan silang dengan database lengkap 38 Provinsi, 514 Kabupaten/Kota, 7.200+ Kecamatan, dan 83.000+ Kelurahan.",
        "Koreksi otomatis typo nama kabupaten (misal: 'KOAKA' ➔ KOLAKA, 'MINA' ➔ MUNA).",
        "Validasi 6 digit kode wilayah depan NIK dengan kode administrasi resmi Kemendagri.",
      ],
    },
    {
      step: "06",
      title: "Blowfish-128 Encryption & Storage",
      subtitle: "Pengamanan Kriptografi & Penyimpanan Database",
      icon: Shield,
      details: [
        "Struktur data JSON divalidasi dengan skema Zod sebelum masuk tahap pengamanan.",
        "Setiap field sensitif dienkripsi secara independen dengan algoritma Blowfish 16-round Feistel Network.",
        "Disimpan ke database dalam bentuk ciphertext hex aman.",
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analisis pipeline OCR"
        description="Alur yang dilalui citra KTP — dari kamera ponsel hingga menjadi data terstruktur yang siap dienkripsi."
        actions={
          <>
            <Badge variant="outline">Tesseract v5 · LSTM</Badge>
            <Badge variant="outline">Fuzzy Levenshtein</Badge>
            <Badge variant="outline">38 provinsi</Badge>
          </>
        }
      />

      {/* Main Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs">
            <Workflow className="size-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-1.5 text-xs">
            <Play className="size-3.5" /> Uji parser
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Layers className="size-3.5" /> Kamus ({ALL_LOOKALIKE_RULES.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 6 TAHAP PIPELINE LENGKAP */}
        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stages.map((stage) => {
              const Icon = stage.icon;
              return (
                <Card key={stage.step} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-semibold leading-snug">{stage.title}</CardTitle>
                          <CardDescription className="mt-0.5 text-xs">{stage.subtitle}</CardDescription>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {stage.step}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="text-[13px] leading-relaxed">
                    <ul className="space-y-2 text-muted-foreground">
                      {stage.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Perjalanan data</CardTitle>
              <CardDescription className="text-xs">
                Dari foto mentah hingga ciphertext yang tersimpan di database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-stretch justify-between gap-2 md:flex-row">
                <div className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-3 text-center">
                  <Scan className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Foto KTP</span>
                  <span className="text-[11px] text-muted-foreground">Kamera atau unggahan</span>
                </div>
                <div className="hidden items-center text-muted-foreground md:flex">→</div>
                <div className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-3 text-center">
                  <Sliders className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Prapemrosesan</span>
                  <span className="text-[11px] text-muted-foreground">Grayscale 1200px</span>
                </div>
                <div className="hidden items-center text-muted-foreground md:flex">→</div>
                <div className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-3 text-center">
                  <Cpu className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Tesseract OCR</span>
                  <span className="text-[11px] text-muted-foreground">Pengenalan LSTM</span>
                </div>
                <div className="hidden items-center text-muted-foreground md:flex">→</div>
                <div className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-3 text-center">
                  <Workflow className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Parser</span>
                  <span className="text-[11px] text-muted-foreground">Lookalike & wilayah</span>
                </div>
                <div className="hidden items-center text-muted-foreground md:flex">→</div>
                <div className="flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-3 text-center">
                  <Shield className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Blowfish</span>
                  <span className="text-[11px] text-muted-foreground">Ciphertext tersimpan</span>
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm font-semibold">
                    <span>Pilih skenario uji coba</span>
                    <Badge variant="secondary">Interaktif</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pilih contoh teks OCR untuk mengamati cara parser menormalkan field.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {SAMPLE_OCR_CASES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCase(c)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                          selectedCase.id === c.id
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-border/70 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-medium text-foreground">{c.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.description}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {c.badge}
                        </Badge>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label
                      htmlFor="ocr-raw-text"
                      className="mb-1 block text-xs font-medium text-foreground"
                    >
                      Teks mentah OCR — dapat diedit
                    </label>
                    <textarea
                      id="ocr-raw-text"
                      rows={9}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="w-full rounded-md border border-input bg-card p-2.5 font-mono text-xs leading-relaxed focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    />
                  </div>

                  <Button onClick={handleRunParser} className="w-full gap-2 text-xs font-medium">
                    <Play className="size-3.5" /> Uji parsing
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Output Hasil Ekstraksi */}
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 className="size-4 text-primary" /> Hasil transformasi data
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        Data setelah normalisasi label, koreksi lookalike, dan verifikasi wilayah.
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="shrink-0">
                      Ternormalisasi
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Nomor NIK</span>
                      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                        {parsedResult.data.nik || <span className="font-sans text-muted-foreground italic">Tidak terbaca</span>}
                      </span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Nama lengkap</span>
                      <span className="block truncate text-sm font-medium text-foreground">
                        {parsedResult.data.nama || "-"}
                      </span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Tempat / tanggal lahir</span>
                      <span className="text-sm font-medium text-foreground">
                        {parsedResult.data.tempatLahir || "-"}, {parsedResult.data.tanggalLahir || "-"}
                      </span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Jenis kelamin / gol. darah</span>
                      <span className="text-sm font-medium text-foreground">
                        {parsedResult.data.jenisKelamin || "-"} (Gol. {parsedResult.data.golonganDarah || "-"})
                      </span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Provinsi</span>
                      <span className="text-sm font-medium text-foreground">
                        {parsedResult.data.provinsi || "-"}
                      </span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Kabupaten / kota</span>
                      <span className="text-sm font-medium text-foreground">
                        {parsedResult.data.kabupatenKota || "-"}
                      </span>
                    </div>

                    <div className="col-span-2 rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Alamat & RT/RW</span>
                      <span className="text-sm font-medium text-foreground">
                        {parsedResult.data.alamat || "-"} RT {parsedResult.data.rt || "-"} / RW {parsedResult.data.rw || "-"}
                      </span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Kecamatan / kelurahan</span>
                      <span className="text-sm font-medium text-foreground">
                        Kec. {parsedResult.data.kecamatan || "-"} / Kel. {parsedResult.data.kelurahanDesa || "-"}
                      </span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                      <span className="block text-[11px] text-muted-foreground">Agama / status kawin</span>
                      <span className="text-sm font-medium text-foreground">
                        {parsedResult.data.agama || "-"} / {parsedResult.data.statusPerkawinan || "-"}
                      </span>
                    </div>
                  </div>

                  {parsedResult.warnings.length > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-foreground">
                      <Info className="mt-0.5 size-4 shrink-0 text-warning" />
                      <div className="space-y-1">
                        <p className="font-medium">Catatan parser</p>
                        <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Kamus koreksi karakter ({filteredRules.length} aturan)
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Matriks penanganan ambiguitas OCR-B, normalisasi alfabet, dan perbaikan typo
                    wilayah.
                  </CardDescription>
                </div>

                {/* Search box */}
                <input
                  type="text"
                  placeholder="Cari target, masukan, atau hasil…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-xs rounded-md border border-input bg-card px-3 py-1.5 text-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                />
              </div>

              {/* Filter Tabs / Badges */}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3">
                <span className="mr-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Filter className="size-3" /> Kategori
                </span>
                {[
                  { id: "all", label: "Semua" },
                  { id: "nik", label: "Angka NIK" },
                  { id: "letters", label: "Huruf nama" },
                  { id: "blood", label: "Gol. darah" },
                  { id: "rtrw", label: "Format RT/RW" },
                  { id: "labels", label: "Label field" },
                  { id: "wilayah", label: "Typo wilayah" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as LookalikeCategory)}
                    className={`rounded px-2.5 py-1 text-xs transition-colors ${
                      activeCategory === cat.id
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                      <th className="p-2.5 font-medium">Kategori</th>
                      <th className="p-2.5 font-medium">Target</th>
                      <th className="p-2.5 font-medium">Masukan OCR</th>
                      <th className="p-2.5 font-medium">Normalisasi</th>
                      <th className="p-2.5 font-medium">Konteks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filteredRules.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {r.category}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-medium text-foreground">{r.target}</td>
                        <td className="bg-muted/30 p-2.5 font-mono text-foreground">{r.input}</td>
                        <td className="bg-muted/30 p-2.5 font-mono font-semibold text-foreground">{r.output}</td>
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
