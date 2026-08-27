import { useState } from "react";
import {
  Shield,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  BarChart3,
  Layers,
  Cpu,
  Fingerprint,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  calculateAvalancheEffect,
  calculateShannonEntropy,
  runPerformanceBenchmark,
  type AvalancheResult,
  type EntropyResult,
  type BenchmarkItem,
} from "@/crypto/securityAnalysis";
import { encryptUtf8WithBlowfish } from "@/crypto/blowfish";

export function SecurityAnalysisPage() {
  // State Avalanche Effect
  const [avalanchePlaintext, setAvalanchePlaintext] = useState(
    "NIK: 7403140408020001, NAMA: LA ODE LUKMANA, PROV: SULAWESI TENGGARA",
  );
  const [avalancheKey, setAvalancheKey] = useState("KunciSkripsiBlowfish2026");
  const [avalancheMode, setAvalancheMode] = useState<"flip_plaintext_bit" | "flip_key_bit">("flip_plaintext_bit");
  const [avalancheResult, setAvalancheResult] = useState<AvalancheResult | null>(() =>
    calculateAvalancheEffect(
      "NIK: 7403140408020001, NAMA: LA ODE LUKMANA, PROV: SULAWESI TENGGARA",
      "KunciSkripsiBlowfish2026",
      "flip_plaintext_bit",
    ),
  );

  // State Shannon Entropy
  const [entropyInput, setEntropyInput] = useState(
    JSON.stringify({
      nik: "7403140408020001",
      nama: "LA ODE LUKMANA",
      alamat: "KEL DANA, WATOPUTE, MUNA",
    }),
  );
  const [entropyKey, setEntropyKey] = useState("KunciBlowfishEnkripsiKTP");
  const [entropyResult, setEntropyResult] = useState<EntropyResult | null>(() => {
    const enc = encryptUtf8WithBlowfish(
      JSON.stringify({
        nik: "7403140408020001",
        nama: "LA ODE LUKMANA",
        alamat: "KEL DANA, WATOPUTE, MUNA",
      }),
      "KunciBlowfishEnkripsiKTP",
    );
    return calculateShannonEntropy(enc.ciphertextHex);
  });

  // State Performance Benchmark
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const handleRunAvalanche = () => {
    const res = calculateAvalancheEffect(avalanchePlaintext, avalancheKey, avalancheMode);
    setAvalancheResult(res);
  };

  const handleRunEntropy = () => {
    const enc = encryptUtf8WithBlowfish(entropyInput, entropyKey);
    const res = calculateShannonEntropy(enc.ciphertextHex);
    setEntropyResult(res);
  };

  const handleRunBenchmark = () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      const items = runPerformanceBenchmark("BenchmarkBlowfishKey2026");
      setBenchmarks(items);
      setIsBenchmarking(false);
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Shield className="size-6 text-primary" /> Modul Analisis Keamanan Kriptografi Blowfish
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Instrumen pengujian empiris dan matematis algoritma Blowfish untuk keperluan penelitian tugas akhir & analisis keamanan data KTP.
        </p>
      </div>

      <Tabs defaultValue="avalanche" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="avalanche" className="text-xs">
            Avalanche Effect
          </TabsTrigger>
          <TabsTrigger value="entropy" className="text-xs">
            Shannon Entropy
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs">
            Benchmark Kecepatan
          </TabsTrigger>
        </TabsList>

        {/* ---------------- 1. AVALANCHE EFFECT ---------------- */}
        <TabsContent value="avalanche" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Fingerprint className="size-4 text-primary" /> Parameter Pengujian
                </CardTitle>
                <CardDescription className="text-xs">
                  Uji pengaruh perubahan 1-bit input terhadap keluaran ciphertext (Strict Avalanche Criterion)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="avalanchePlaintext" className="text-xs font-semibold">
                    Plaintext Dokumen KTP
                  </Label>
                  <Textarea
                    id="avalanchePlaintext"
                    rows={3}
                    value={avalanchePlaintext}
                    onChange={(e) => setAvalanchePlaintext(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="avalancheKey" className="text-xs font-semibold">
                    Kunci Enkripsi (Secret Key)
                  </Label>
                  <Input
                    id="avalancheKey"
                    value={avalancheKey}
                    onChange={(e) => setAvalancheKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mode Modifikasi 1-Bit:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={avalancheMode === "flip_plaintext_bit" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAvalancheMode("flip_plaintext_bit")}
                      className="text-xs h-8"
                    >
                      Bit Plaintext
                    </Button>
                    <Button
                      type="button"
                      variant={avalancheMode === "flip_key_bit" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAvalancheMode("flip_key_bit")}
                      className="text-xs h-8"
                    >
                      Bit Kunci (Key)
                    </Button>
                  </div>
                </div>

                <Button onClick={handleRunAvalanche} className="w-full gap-2 mt-2">
                  <Play className="size-4" /> Hitung Avalanche Effect
                </Button>
              </CardContent>
            </Card>

            {/* Hasil Avalanche Effect */}
            <Card className="lg:col-span-7">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Hasil Analisis Avalanche Effect</span>
                  {avalancheResult && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Target Ideal: ~50%
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Tingkat difusi bit melalui 16 putaran Feistel Network Blowfish
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                {avalancheResult && (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl border bg-muted/30">
                        <span className="text-muted-foreground text-[11px]">Total Bit</span>
                        <p className="text-xl font-bold text-foreground mt-0.5">{avalancheResult.totalBits}</p>
                      </div>
                      <div className="p-3 rounded-xl border bg-muted/30">
                        <span className="text-muted-foreground text-[11px]">Bit Berubah (Flipped)</span>
                        <p className="text-xl font-bold text-primary mt-0.5">{avalancheResult.flippedBits}</p>
                      </div>
                      <div className="p-3 rounded-xl border bg-primary/10 border-primary/30">
                        <span className="text-primary font-semibold text-[11px]">Persentase Efek</span>
                        <p className="text-2xl font-extrabold text-primary mt-0.5">
                          {avalancheResult.avalanchePercentage}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Skor Strict Avalanche Criterion (SAC):</span>
                        <span className="text-primary">{avalancheResult.avalanchePercentage}%</span>
                      </div>
                      <Progress value={avalancheResult.avalanchePercentage} className="h-3" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0% (Sangat Buruk)</span>
                        <span className="font-bold text-foreground">50% (Sempurna)</span>
                        <span>100% (Inversi Penuh)</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span className="font-bold text-foreground">{avalancheResult.verdict}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Nilai Avalanche Effect mendekati 50% membuktikan bahwa struktur Feistel Network 16-putaran 
                        dengan S-boxes turunan bilangan Pi menghasilkan sifat difusi yang sangat kuat. Perubahan kecil 
                        pada satu bit menyebabkan seluruh blok ciphertext berubah secara drastis dan acak.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Perbandingan Sampel Blok Ciphertext Hex:</Label>
                      <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] space-y-1 text-slate-300">
                        <div><span className="text-muted-foreground">C1 (Asli) :</span> <span className="text-sky-400">{avalancheResult.sampleBlockHex1}</span></div>
                        <div><span className="text-muted-foreground">C2 (Modif):</span> <span className="text-emerald-400">{avalancheResult.sampleBlockHex2}</span></div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- 2. SHANNON ENTROPY ---------------- */}
        <TabsContent value="entropy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> Pengujian Entropi Informasi
                </CardTitle>
                <CardDescription className="text-xs">
                  Mengukur tingkat ketidakpastian dan keacakan distribusi byte ciphertext Blowfish
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="entropyInput" className="text-xs font-semibold">
                    Payload Data KTP (Plaintext)
                  </Label>
                  <Textarea
                    id="entropyInput"
                    rows={4}
                    value={entropyInput}
                    onChange={(e) => setEntropyInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="entropyKey" className="text-xs font-semibold">
                    Kunci Enkripsi
                  </Label>
                  <Input
                    id="entropyKey"
                    value={entropyKey}
                    onChange={(e) => setEntropyKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <Button onClick={handleRunEntropy} className="w-full gap-2 mt-2">
                  <Play className="size-4" /> Hitung Shannon Entropy
                </Button>
              </CardContent>
            </Card>

            {/* Hasil Entropy */}
            <Card className="lg:col-span-7">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Hasil Analisis Shannon Entropy H(X)</span>
                  {entropyResult && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Maksimal: 8.0000 bit/byte
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Entropi ideal bernilai mendekati 8 bit per byte untuk enkripsi simetris berkualitas tinggi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                {entropyResult && (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
                        <span className="text-muted-foreground text-[11px]">Nilai Entropi H(X)</span>
                        <p className="text-3xl font-extrabold text-primary mt-1">
                          {entropyResult.entropy} <span className="text-sm font-normal">/ 8.0</span>
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border bg-muted/30">
                        <span className="text-muted-foreground text-[11px]">Tingkat Keacakan</span>
                        <p className="text-3xl font-extrabold text-foreground mt-1">
                          {entropyResult.idealPercentage}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Indeks Entropi Informasi:</span>
                        <span className="text-emerald-600">{entropyResult.idealPercentage}%</span>
                      </div>
                      <Progress value={entropyResult.idealPercentage} className="h-3" />
                    </div>

                    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span className="font-bold text-foreground">{entropyResult.verdict}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Hasil perhitungan Shannon Entropy menunjukkan bahwa ciphertext yang dihasilkan oleh 
                        implementasi Blowfish ini memiliki distribusi byte yang merata dan seragam (uniform distribution), 
                        sehingga tahan terhadap serangan analisis frekuensi (frequency analysis attack).
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- 3. BENCHMARK KECEPATAN ---------------- */}
        <TabsContent value="benchmark" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="size-4 text-amber-500" /> Benchmark Kecepatan & Throughput Blowfish
                </CardTitle>
                <CardDescription className="text-xs">
                  Uji komputasi waktu enkripsi dan dekripsi pada berbagai ukuran volume data KTP
                </CardDescription>
              </div>

              <Button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="text-xs gap-1.5"
              >
                <Play className={`size-3.5 ${isBenchmarking ? "animate-spin" : ""}`} />
                {isBenchmarking ? "Menjalankan Uji..." : "Jalankan Benchmark"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {benchmarks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-3">
                  <Cpu className="size-10 mx-auto opacity-30 text-primary" />
                  <p>Tekan tombol di atas untuk menjalankan uji benchmark kecepatan komputasi Blowfish.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {benchmarks.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                      <div className="font-semibold text-foreground text-xs">{b.payloadLabel}</div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ukuran:</span>
                          <span className="font-mono">{b.payloadSizeBytes} bytes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Enkripsi:</span>
                          <span className="font-mono font-bold text-sky-600">{b.encryptionTimeMs} ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dekripsi:</span>
                          <span className="font-mono font-bold text-indigo-600">{b.decryptionTimeMs} ms</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-semibold">
                          <span className="text-foreground">Throughput:</span>
                          <span className="font-mono text-emerald-600">{b.throughputKbPerSec} KB/s</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
