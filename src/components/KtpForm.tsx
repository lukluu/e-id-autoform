import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useForm, Controller, type Control, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, RotateCcw, Save, Trash2, TriangleAlert, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROVINSI_LIST,
  getKabupatenKota,
  getKecamatan,
  getDesaAsync,
  matchDesa,
  resolveCompleteWilayahHierarchy,
} from "@/data/wilayahIndonesia";
import {
  AGAMA,
  GOLONGAN_DARAH,
  JENIS_KELAMIN,
  KEWARGANEGARAAN,
  STATUS_PERKAWINAN,
  type KtpData,
  type KtpField,
} from "@/types/ktp";
import { ktpSchema, padRtRw, type KtpFormValues } from "@/utils/validation";

interface KtpFormProps {
  data: KtpData;
  onSubmitData: (values: KtpData, secretKey: string) => void;
  onReset: () => void;
  onClear: () => void;
  isEncrypting?: boolean | undefined;
  secretKey: string;
  setSecretKey: (val: string) => void;
  showKey: boolean;
  setShowKey: (val: boolean | ((prev: boolean) => boolean)) => void;
  keyError: string | null;
  setKeyError: (val: string | null) => void;
}

interface FieldShellProps {
  label: string;
  field: KtpField;
  errors: FieldErrors<KtpFormValues>;
  children: React.ReactNode;
}

function FieldShell({ label, field, errors, children }: FieldShellProps) {
  const error = errors[field];
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={field} className={error ? "text-destructive" : ""}>
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive">{String(error.message ?? "")}</p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  field: KtpField;
  options: readonly string[] | string[];
  control: Control<KtpFormValues>;
}

function SelectField({ field, options, control }: SelectFieldProps) {
  return (
    <Controller
      control={control}
      name={field}
      render={({ field: rhf }) => (
        <Select value={String(rhf.value ?? "")} onValueChange={rhf.onChange}>
          <SelectTrigger id={field} className="w-full">
            <SelectValue placeholder="Pilih..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

/** Combobox: text input + filtered dropdown dari daftar desa resmi sesuai kecamatan */
interface DesaComboboxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

function DesaCombobox({ value, onChange, options, placeholder }: DesaComboboxProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return options.slice(0, 50);
    const q = value.toUpperCase();
    const starts = options.filter((o) => o.toUpperCase().startsWith(q));
    const contains = options.filter(
      (o) => !o.toUpperCase().startsWith(q) && o.toUpperCase().includes(q),
    );
    return [...starts, ...contains].slice(0, 50);
  }, [value, options]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center">
        <Input
          id="kelurahanDesa"
          value={value}
          placeholder={
            placeholder ||
            (options.length > 0
              ? `Ketik atau pilih desa/kelurahan (${options.length} tersedia)`
              : "Nama kelurahan atau desa")
          }
          autoComplete="off"
          className="pr-8"
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {options.length > 0 && (
          <button
            type="button"
            className="absolute right-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen((prev) => !prev)}
            tabIndex={-1}
          >
            <ChevronDown className="size-4" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((opt) => (
            <div
              key={opt}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between ${
                opt.toUpperCase() === value.toUpperCase() ? "bg-accent/50 font-medium" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
            >
              <span>{opt}</span>
              {opt.toUpperCase() === value.toUpperCase() && (
                <CheckCircle2 className="size-3.5 text-primary ml-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KtpForm({
  data,
  onSubmitData,
  onReset,
  onClear,
  isEncrypting,
  secretKey,
  setSecretKey,
  showKey,
  setShowKey,
  keyError,
  setKeyError,
}: KtpFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitSuccessful },
  } = useForm<KtpFormValues>({
    resolver: zodResolver(ktpSchema),
    defaultValues: data as KtpFormValues,
    mode: "onBlur",
  });

  // ---- Wilayah Options state ----
  const [kabupatenOptions, setKabupatenOptions] = useState<string[]>([]);
  const [kecamatanOptions, setKecamatanOptions] = useState<string[]>([]);
  const [desaOptions, setDesaOptions] = useState<string[]>([]);

  const provinsi = watch("provinsi");
  const kabupatenKota = watch("kabupatenKota");
  const kecamatan = watch("kecamatan");

  /**
   * 1. Inisialisasi awal saat hasil OCR masuk:
   *    Menyelesaikan seluruh 4 level (Provinsi, Kabupaten, Kecamatan, Desa) secara otomatis,
   *    membandingkan kemiripan, mengisi field kosong (reverse lookup), dan memuat opsi desa.
   */
  useEffect(() => {
    let cancelled = false;

    async function initWilayah() {
      try {
        const resolved = await resolveCompleteWilayahHierarchy({
          provinsi: data.provinsi,
          kabupatenKota: data.kabupatenKota,
          kecamatan: data.kecamatan,
          kelurahanDesa: data.kelurahanDesa,
          nik: data.nik,
        });

        if (cancelled) return;

        const initialValues: KtpFormValues = {
          ...(data as KtpFormValues),
          provinsi: resolved.provinsi || data.provinsi || "",
          kabupatenKota: resolved.kabupatenKota || data.kabupatenKota || "",
          kecamatan: resolved.kecamatan || data.kecamatan || "",
          kelurahanDesa: resolved.kelurahanDesa || data.kelurahanDesa || "",
        };

        reset(initialValues);

        if (resolved.provinsi) {
          setKabupatenOptions(getKabupatenKota(resolved.provinsi));
        }
        if (resolved.provinsi && resolved.kabupatenKota) {
          setKecamatanOptions(getKecamatan(resolved.provinsi, resolved.kabupatenKota));
        }
        if (resolved.desaOptions.length > 0) {
          setDesaOptions(resolved.desaOptions);
        }
      } catch {
        if (!cancelled) {
          reset(data as KtpFormValues);
        }
      }
    }

    void initWilayah();
    return () => {
      cancelled = true;
    };
  }, [data, reset]);

  /** 2. Reaktif: Setiap kali provinsi berubah (oleh user), sinkronkan opsi kabupaten */
  useEffect(() => {
    if (provinsi) {
      setKabupatenOptions(getKabupatenKota(provinsi));
    } else {
      setKabupatenOptions([]);
    }
  }, [provinsi]);

  /** 3. Reaktif: Setiap kali kabupaten berubah (oleh user), sinkronkan opsi kecamatan */
  useEffect(() => {
    if (provinsi && kabupatenKota) {
      const list = getKecamatan(provinsi, kabupatenKota);
      setKecamatanOptions(list);
    } else {
      setKecamatanOptions([]);
    }
  }, [provinsi, kabupatenKota]);

  /** 4. Reaktif: Setiap kali kecamatan berubah, muat daftar desa/kelurahan dari database/API */
  useEffect(() => {
    let active = true;

    if (provinsi && kabupatenKota && kecamatan) {
      void getDesaAsync(provinsi, kabupatenKota, kecamatan).then((list) => {
        if (!active) return;
        setDesaOptions(list);
        const currentDesa = watch("kelurahanDesa");
        if (currentDesa && list.length > 0) {
          const matched = matchDesa(currentDesa, list);
          if (matched && matched !== currentDesa) {
            setValue("kelurahanDesa", matched, { shouldValidate: true, shouldDirty: true });
          }
        }
      });
    } else {
      setDesaOptions([]);
    }

    return () => {
      active = false;
    };
  }, [provinsi, kabupatenKota, kecamatan, setValue, watch]);

  // ---- Handlers dropdown wilayah (oleh user) ----
  const handleProvinsiChange = useCallback(
    (newProv: string, onChange: (val: string) => void) => {
      onChange(newProv);
      setValue("provinsi", newProv, { shouldValidate: true, shouldDirty: true });
      setValue("kabupatenKota", "");
      setValue("kecamatan", "");
      setValue("kelurahanDesa", "");
      setKabupatenOptions(getKabupatenKota(newProv));
      setKecamatanOptions([]);
      setDesaOptions([]);
    },
    [setValue],
  );

  const handleKabupatenChange = useCallback(
    (newKab: string, onChange: (val: string) => void) => {
      onChange(newKab);
      setValue("kabupatenKota", newKab, { shouldValidate: true, shouldDirty: true });
      setValue("kecamatan", "");
      setValue("kelurahanDesa", "");
      const currentProv = watch("provinsi");
      setKecamatanOptions(getKecamatan(currentProv, newKab));
      setDesaOptions([]);
    },
    [setValue, watch],
  );

  const handleKecamatanChange = useCallback(
    (newKec: string, onChange: (val: string) => void) => {
      onChange(newKec);
      setValue("kecamatan", newKec, { shouldValidate: true, shouldDirty: true });
      setValue("kelurahanDesa", "");
      setDesaOptions([]);
    },
    [setValue],
  );

  // ---- useMemo: pastikan nilai OCR tetap tampil di dropdown meski belum ada di list ----
  const displayedKabupatenOptions = useMemo(() => {
    if (kabupatenKota && !kabupatenOptions.includes(kabupatenKota)) {
      return [kabupatenKota, ...kabupatenOptions];
    }
    return kabupatenOptions;
  }, [kabupatenKota, kabupatenOptions]);

  const displayedKecamatanOptions = useMemo(() => {
    if (kecamatan && !kecamatanOptions.includes(kecamatan)) {
      return [kecamatan, ...kecamatanOptions];
    }
    return kecamatanOptions;
  }, [kecamatan, kecamatanOptions]);

  const berlakuHingga = watch("berlakuHingga");
  const seumurHidup = (berlakuHingga ?? "").toUpperCase() === "SEUMUR HIDUP";

  return (
    <form
      onSubmit={handleSubmit((values) => {
        if (!secretKey || secretKey.trim().length === 0) {
          setKeyError("Kunci enkripsi rahasia wajib diisi.");
          return;
        }
        onSubmitData(values as KtpData, secretKey.trim());
      })}
      className="space-y-4"
      autoComplete="off"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Identitas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldShell label="NIK" field="nik" errors={errors}>
              <Input
                id="nik"
                inputMode="numeric"
                maxLength={16}
                {...register("nik", {
                  setValueAs: (v: string) => String(v ?? "").replace(/\D/g, ""),
                })}
              />
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <FieldShell label="Nama Lengkap" field="nama" errors={errors}>
              <Input id="nama" {...register("nama")} />
            </FieldShell>
          </div>
          <FieldShell label="Tempat Lahir" field="tempatLahir" errors={errors}>
            <Input id="tempatLahir" {...register("tempatLahir")} />
          </FieldShell>
          <FieldShell label="Tanggal Lahir" field="tanggalLahir" errors={errors}>
            <Input id="tanggalLahir" type="date" {...register("tanggalLahir")} />
          </FieldShell>
          <FieldShell label="Jenis Kelamin" field="jenisKelamin" errors={errors}>
            <SelectField field="jenisKelamin" options={JENIS_KELAMIN} control={control} />
          </FieldShell>
          <FieldShell label="Golongan Darah" field="golonganDarah" errors={errors}>
            <SelectField field="golonganDarah" options={GOLONGAN_DARAH} control={control} />
          </FieldShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Alamat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldShell label="Alamat" field="alamat" errors={errors}>
              <Textarea id="alamat" rows={2} {...register("alamat")} />
            </FieldShell>
          </div>
          <FieldShell label="RT" field="rt" errors={errors}>
            <Input
              id="rt"
              inputMode="numeric"
              maxLength={3}
              {...register("rt", {
                setValueAs: (v: string) => padRtRw(String(v ?? "")),
              })}
            />
          </FieldShell>
          <FieldShell label="RW" field="rw" errors={errors}>
            <Input
              id="rw"
              inputMode="numeric"
              maxLength={3}
              {...register("rw", {
                setValueAs: (v: string) => padRtRw(String(v ?? "")),
              })}
            />
          </FieldShell>

          {/* ── Provinsi ── */}
          <FieldShell label="Provinsi" field="provinsi" errors={errors}>
            <Controller
              control={control}
              name="provinsi"
              render={({ field: rhf }) => (
                <Select
                  value={rhf.value || ""}
                  onValueChange={(v) => handleProvinsiChange(v, rhf.onChange)}
                >
                  <SelectTrigger id="provinsi" className="w-full">
                    <SelectValue placeholder="Pilih provinsi" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {PROVINSI_LIST.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          {/* ── Kabupaten / Kota ── */}
          <FieldShell label="Kabupaten / Kota" field="kabupatenKota" errors={errors}>
            <Controller
              control={control}
              name="kabupatenKota"
              render={({ field: rhf }) => (
                <Select
                  value={rhf.value || ""}
                  onValueChange={(v) => handleKabupatenChange(v, rhf.onChange)}
                >
                  <SelectTrigger id="kabupatenKota" className="w-full">
                    <SelectValue
                      placeholder={
                        provinsi ? "Pilih kabupaten/kota" : "Pilih provinsi terlebih dahulu"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {displayedKabupatenOptions.length > 0 ? (
                      displayedKabupatenOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_empty_kab" disabled>
                        Pilih provinsi terlebih dahulu
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          {/* ── Kecamatan ── */}
          <FieldShell label="Kecamatan" field="kecamatan" errors={errors}>
            <Controller
              control={control}
              name="kecamatan"
              render={({ field: rhf }) => (
                <Select
                  value={rhf.value || ""}
                  onValueChange={(v) => handleKecamatanChange(v, rhf.onChange)}
                >
                  <SelectTrigger id="kecamatan" className="w-full">
                    <SelectValue
                      placeholder={
                        kabupatenKota
                          ? "Pilih kecamatan"
                          : "Pilih kabupaten terlebih dahulu"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {displayedKecamatanOptions.length > 0 ? (
                      displayedKecamatanOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_empty_kec" disabled>
                        Pilih kabupaten terlebih dahulu
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          {/* ── Kelurahan / Desa: Combobox dengan dropdown pilihan desa resmi ── */}
          <FieldShell label="Kelurahan / Desa" field="kelurahanDesa" errors={errors}>
            <Controller
              control={control}
              name="kelurahanDesa"
              render={({ field: rhf }) => (
                <DesaCombobox
                  value={rhf.value || ""}
                  onChange={(v) => rhf.onChange(v)}
                  options={desaOptions}
                  placeholder={
                    kecamatan
                      ? `Ketik atau pilih desa/kelurahan (${desaOptions.length} desa)`
                      : "Pilih kecamatan terlebih dahulu atau ketik desa"
                  }
                />
              )}
            />
          </FieldShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Lainnya</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <FieldShell label="Agama" field="agama" errors={errors}>
            <SelectField field="agama" options={AGAMA} control={control} />
          </FieldShell>
          <FieldShell label="Status Perkawinan" field="statusPerkawinan" errors={errors}>
            <SelectField field="statusPerkawinan" options={STATUS_PERKAWINAN} control={control} />
          </FieldShell>
          <FieldShell label="Pekerjaan" field="pekerjaan" errors={errors}>
            <Input id="pekerjaan" {...register("pekerjaan")} />
          </FieldShell>
          <FieldShell label="Kewarganegaraan" field="kewarganegaraan" errors={errors}>
            <SelectField field="kewarganegaraan" options={KEWARGANEGARAAN} control={control} />
          </FieldShell>
          <div className="sm:col-span-2">
            <FieldShell label="Berlaku Hingga" field="berlakuHingga" errors={errors}>
              <div className="flex gap-2">
                <Input
                  id="berlakuHingga"
                  placeholder="DD-MM-YYYY atau SEUMUR HIDUP"
                  className="min-w-0 flex-1"
                  {...register("berlakuHingga")}
                />
                <Button
                  type="button"
                  variant={seumurHidup ? "default" : "outline"}
                  onClick={() => setValue("berlakuHingga", seumurHidup ? "" : "SEUMUR HIDUP")}
                >
                  SEUMUR HIDUP
                </Button>
              </div>
            </FieldShell>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kunci Enkripsi</CardTitle>
          <CardDescription className="text-xs">
            Kunci rahasia untuk mengenkripsi data KTP. Simpan baik-baik — diperlukan saat dekripsi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="secretKey" className="text-xs font-semibold">
              Kunci Rahasia <span className="text-destructive ml-0.5">*</span>
            </Label>
            <div className="relative flex items-center max-w-md">
              <Input
                id="secretKey"
                type={showKey ? "text" : "password"}
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  setKeyError(null);
                }}
                placeholder="Masukkan kunci enkripsi bebas..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
          </div>
        </CardContent>
      </Card>

      {Object.keys(errors).length > 0 && (
        <p className="flex items-center gap-2 text-xs font-medium text-destructive">
          <TriangleAlert className="size-4" /> Beberapa field belum valid. Periksa kembali sebelum
          menyimpan.
        </p>
      )}
      {isSubmitSuccessful && (
        <p className="flex items-center gap-2 text-xs font-medium text-success">
          <CheckCircle2 className="size-4" /> Data berhasil disimpan di sesi ini.
        </p>
      )}

      <div className="flex flex-wrap gap-2 pb-4">
        <Button type="submit" disabled={isEncrypting} className="gap-2 font-medium shadow-sm">
          {isEncrypting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Mengenkripsi & Menyimpan...
            </>
          ) : (
            <>
              <Lock className="size-4" /> Simpan & Enkripsi KTP
            </>
          )}
        </Button>
        <Button type="button" variant="outline" disabled={isEncrypting} className="gap-2" onClick={onReset}>
          <RotateCcw className="size-4" /> Kembalikan Hasil OCR
        </Button>
        <Button type="button" variant="ghost" disabled={isEncrypting} className="gap-2 text-destructive hover:text-destructive" onClick={onClear}>
          <Trash2 className="size-4" /> Hapus Data
        </Button>
      </div>
    </form>
  );
}
