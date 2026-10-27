import { useState } from "react";
import { Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
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
    "NIK: 7401044511030004, NAMA: DIAN RAMADAN. L, PROV: SULAWESI TENGGARA, KAB: KABUPATEN KOLAKA",
  );
  const [avalancheKey, setAvalancheKey] = useState("KunciSkripsiBlowfish2026");
  const [avalancheMode, setAvalancheMode] = useState<"flip_plaintext_bit" | "flip_key_bit">("flip_plaintext_bit");
  const [avalancheResult, setAvalancheResult] = useState<AvalancheResult | null>(() =>
    calculateAvalancheEffect(
      "NIK: 7401044511030004, NAMA: DIAN RAMADAN. L, PROV: SULAWESI TENGGARA, KAB: KABUPATEN KOLAKA",
      "KunciSkripsiBlowfish2026",
      "flip_plaintext_bit",
    ),
  );

  // State Shannon Entropy
  const [entropyInput, setEntropyInput] = useState(
    JSON.stringify({
      nik: "7401044511030004",
      nama: "DIAN RAMADAN. L",
      alamat: "LINGK. IV EPE, WUNDULAKO, KOLAKA",
    }),
  );
  const [entropyKey, setEntropyKey] = useState("KunciBlowfishEnkripsiKTP");
  const [entropyResult, setEntropyResult] = useState<EntropyResult | null>(() => {
    const enc = encryptUtf8WithBlowfish(
      JSON.stringify({
        nik: "7401044511030004",
        nama: "DIAN RAMADAN. L",
        alamat: "LINGK. IV EPE, WUNDULAKO, KOLAKA",
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
    <div className="space-y-8">
      <PageHeader
        title="Analisis kriptografi"
        description="Uji avalanche effect, entropi Shannon, dan kecepatan Blowfish pada data KTP."
        actions={<Badge variant="outline">16 putaran Feistel</Badge>}
      />

      <Tabs defaultValue="avalanche" className="space-y-6">
        <TabsList className="grid max-w-md grid-cols-3">
          <TabsTrigger value="avalanche" className="text-xs">
            Avalanche effect
          </TabsTrigger>
          <TabsTrigger value="entropy" className="text-xs">
            Entropi Shannon
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs">
            Benchmark
          </TabsTrigger>
        </TabsList>

        {/* ---------------- 1. AVALANCHE EFFECT ---------------- */}
        <TabsContent value="avalanche" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Parameter pengujian</CardTitle>
                <CardDescription className="text-xs">
                  Ukur pengaruh perubahan satu bit masukan terhadap ciphertext.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="avalanchePlaintext" className="text-xs font-medium">
                    Plaintext KTP
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
                  <Label htmlFor="avalancheKey" className="text-xs font-medium">
                    Kunci enkripsi
                  </Label>
                  <Input
                    id="avalancheKey"
                    value={avalancheKey}
                    onChange={(e) => setAvalancheKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Mode modifikasi satu bit</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={avalancheMode === "flip_plaintext_bit" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAvalancheMode("flip_plaintext_bit")}
                      className="h-8 text-xs font-medium"
                    >
                      Bit plaintext
                    </Button>
                    <Button
                      type="button"
                      variant={avalancheMode === "flip_key_bit" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAvalancheMode("flip_key_bit")}
                      className="h-8 text-xs font-medium"
                    >
                      Bit kunci
                    </Button>
                  </div>
                </div>

                <Button onClick={handleRunAvalanche} className="w-full gap-2">
                  <Play className="size-4" /> Hitung avalanche effect
                </Button>
              </CardContent>
            </Card>

            {/* Hasil Avalanche Effect */}
            <Card className="lg:col-span-7">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">Hasil analisis</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Difusi bit melalui 16 putaran Feistel Network.
                    </CardDescription>
                  </div>
                  {avalancheResult && <Badge variant="outline">Target ~50%</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {avalancheResult && (
                  <>
                    <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border bg-card text-center">
                      <div className="px-3 py-3">
                        <dt className="text-[11px] text-muted-foreground">Total bit</dt>
                        <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                          {avalancheResult.totalBits}
                        </dd>
                      </div>
                      <div className="px-3 py-3">
                        <dt className="text-[11px] text-muted-foreground">Bit berubah</dt>
                        <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                          {avalancheResult.flippedBits}
                        </dd>
                      </div>
                      <div className="px-3 py-3">
                        <dt className="text-[11px] text-muted-foreground">Persentase</dt>
                        <dd className="mt-0.5 text-xl font-semibold tabular-nums text-primary">
                          {avalancheResult.avalanchePercentage}%
                        </dd>
                      </div>
                    </dl>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Strict Avalanche Criterion
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {avalancheResult.avalanchePercentage}%
                        </span>
                      </div>
                      <Progress value={avalancheResult.avalanchePercentage} className="h-2" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>0%</span>
                        <span>50% ideal</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5">
                      <p className="text-sm font-medium text-foreground">{avalancheResult.verdict}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Nilai mendekati 50% menunjukkan difusi yang kuat — perubahan satu bit menyebar
                        ke seluruh blok ciphertext.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Perbandingan blok ciphertext</Label>
                      <div className="space-y-1 rounded-lg border border-border/70 bg-muted/30 p-3 font-mono text-[11px]">
                        <div className="flex gap-2">
                          <span className="w-16 shrink-0 text-muted-foreground">C1 asli</span>
                          <span className="break-all text-foreground">{avalancheResult.sampleBlockHex1}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="w-16 shrink-0 text-muted-foreground">C2 ubah</span>
                          <span className="break-all text-primary">{avalancheResult.sampleBlockHex2}</span>
                        </div>
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
                <CardTitle className="text-sm font-semibold">Pengujian entropi</CardTitle>
                <CardDescription className="text-xs">
                  Ukur ketidakpastian dan keacakan distribusi byte ciphertext.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="entropyInput" className="text-xs font-medium">
                    Payload KTP (plaintext)
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
                  <Label htmlFor="entropyKey" className="text-xs font-medium">
                    Kunci enkripsi
                  </Label>
                  <Input
                    id="entropyKey"
                    value={entropyKey}
                    onChange={(e) => setEntropyKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <Button onClick={handleRunEntropy} className="w-full gap-2">
                  <Play className="size-4" /> Hitung entropi Shannon
                </Button>
              </CardContent>
            </Card>

            {/* Hasil Entropy */}
            <Card className="lg:col-span-7">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">Hasil analisis H(X)</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Entropi ideal mendekati 8 bit per byte.
                    </CardDescription>
                  </div>
                  {entropyResult && <Badge variant="outline">Maks. 8.0000 bit/byte</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {entropyResult && (
                  <>
                    <dl className="grid grid-cols-2 divide-x divide-border rounded-lg border bg-card text-center">
                      <div className="px-4 py-3">
                        <dt className="text-[11px] text-muted-foreground">Nilai entropi H(X)</dt>
                        <dd className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                          {entropyResult.entropy}
                          <span className="ml-1 text-sm font-normal text-muted-foreground">/ 8.0</span>
                        </dd>
                      </div>
                      <div className="px-4 py-3">
                        <dt className="text-[11px] text-muted-foreground">Tingkat keacakan</dt>
                        <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                          {entropyResult.idealPercentage}%
                        </dd>
                      </div>
                    </dl>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Indeks entropi informasi</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {entropyResult.idealPercentage}%
                        </span>
                      </div>
                      <Progress value={entropyResult.idealPercentage} className="h-2" />
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5">
                      <p className="text-sm font-medium text-foreground">{entropyResult.verdict}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Distribusi byte yang merata membuat ciphertext tahan terhadap analisis frekuensi.
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
            <CardHeader className="pb-3">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <CardTitle className="text-sm font-semibold">Benchmark kecepatan</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Waktu enkripsi dan dekripsi pada beberapa ukuran data KTP.
                  </CardDescription>
                </div>

                <Button
                  onClick={handleRunBenchmark}
                  disabled={isBenchmarking}
                  size="sm"
                  className="h-8 w-fit gap-1.5 text-xs font-medium"
                >
                  <Play className={`size-3.5 ${isBenchmarking ? "animate-spin" : ""}`} />
                  {isBenchmarking ? "Menjalankan…" : "Jalankan benchmark"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {benchmarks.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Jalankan benchmark untuk mengukur kecepatan komputasi Blowfish.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {benchmarks.map((b, idx) => (
                    <div key={idx} className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
                      <div className="text-xs font-medium text-foreground">{b.payloadLabel}</div>
                      <dl className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Ukuran</dt>
                          <dd className="font-mono tabular-nums text-foreground">{b.payloadSizeBytes} bytes</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Enkripsi</dt>
                          <dd className="font-mono tabular-nums text-foreground">{b.encryptionTimeMs} ms</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Dekripsi</dt>
                          <dd className="font-mono tabular-nums text-foreground">{b.decryptionTimeMs} ms</dd>
                        </div>
                        <div className="flex justify-between border-t border-border/70 pt-1">
                          <dt className="text-muted-foreground">Throughput</dt>
                          <dd className="font-mono font-medium tabular-nums text-foreground">
                            {b.throughputKbPerSec} KB/s
                          </dd>
                        </div>
                      </dl>
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
