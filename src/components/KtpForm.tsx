import { useEffect, useMemo } from "react";
import { useForm, Controller, type Control, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { getKabupatenKota, getProvinsiList } from "@/data/wilayahIndonesia";
import {
  AGAMA,
  GOLONGAN_DARAH,
  JENIS_KELAMIN,
  KEWARGANEGARAAN,
  STATUS_PERKAWINAN,
  type ConfidenceMap,
  type KtpData,
  type KtpField,
} from "@/types/ktp";
import { ktpSchema, padRtRw, type KtpFormValues } from "@/utils/validation";

interface KtpFormProps {
  data: KtpData;
  confidences: ConfidenceMap;
  onSubmitData: (values: KtpData) => void;
  onReset: () => void;
  onClear: () => void;
}

interface FieldShellProps {
  label: string;
  field: KtpField;
  confidences: ConfidenceMap;
  errors: FieldErrors<KtpFormValues>;
  children: React.ReactNode;
}

function FieldShell({ label, field, confidences, errors, children }: FieldShellProps) {
  const confidence = confidences[field];
  const lowConfidence = confidence?.status === "low";
  const error = errors[field]?.message;
  return (
    <div
      className={`space-y-1.5 rounded-lg p-2 transition-colors ${
        lowConfidence ? "bg-warning/10 ring-1 ring-warning/40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={field} className="text-xs font-medium">
          {label}
        </Label>
        <ConfidenceIndicator confidence={confidence} />
      </div>
      {children}
      {error && <p className="text-[11px] font-medium text-destructive">{String(error)}</p>}
    </div>
  );
}

interface SelectFieldProps {
  field: KtpField;
  options: readonly string[];
  control: Control<KtpFormValues>;
  placeholder?: string;
}

function SelectField({ field, options, control, placeholder }: SelectFieldProps) {
  return (
    <Controller
      control={control}
      name={field}
      render={({ field: rhf }) => (
        <Select value={rhf.value || ""} onValueChange={rhf.onChange}>
          <SelectTrigger id={field} className="w-full">
            <SelectValue placeholder={placeholder ?? "Pilih..."} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export function KtpForm({ data, confidences, onSubmitData, onReset, onClear }: KtpFormProps) {
  const {
    control,
    register,
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

  // Autofill setiap kali hasil OCR berubah.
  useEffect(() => {
    reset(data as KtpFormValues);
  }, [data, reset]);

  const provinsi = watch("provinsi");
  const kabupatenOptions = useMemo(() => getKabupatenKota(provinsi ?? ""), [provinsi]);
  const provinsiOptions = useMemo(() => getProvinsiList(), []);

  const berlakuHingga = watch("berlakuHingga");
  const seumurHidup = (berlakuHingga ?? "").toUpperCase() === "SEUMUR HIDUP";

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmitData(values as KtpData))}
      className="space-y-4"
      autoComplete="off"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Identitas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldShell label="NIK" field="nik" confidences={confidences} errors={errors}>
              <Input id="nik" inputMode="numeric" maxLength={16} {...register("nik")} />
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <FieldShell label="Nama Lengkap" field="nama" confidences={confidences} errors={errors}>
              <Input id="nama" {...register("nama")} />
            </FieldShell>
          </div>
          <FieldShell label="Tempat Lahir" field="tempatLahir" confidences={confidences} errors={errors}>
            <Input id="tempatLahir" {...register("tempatLahir")} />
          </FieldShell>
          <FieldShell label="Tanggal Lahir" field="tanggalLahir" confidences={confidences} errors={errors}>
            <Input id="tanggalLahir" type="date" {...register("tanggalLahir")} />
          </FieldShell>
          <FieldShell label="Jenis Kelamin" field="jenisKelamin" confidences={confidences} errors={errors}>
            <SelectField field="jenisKelamin" options={JENIS_KELAMIN} control={control} />
          </FieldShell>
          <FieldShell label="Golongan Darah" field="golonganDarah" confidences={confidences} errors={errors}>
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
            <FieldShell label="Alamat" field="alamat" confidences={confidences} errors={errors}>
              <Textarea id="alamat" rows={2} {...register("alamat")} />
            </FieldShell>
          </div>
          <FieldShell label="RT" field="rt" confidences={confidences} errors={errors}>
            <Input
              id="rt"
              inputMode="numeric"
              maxLength={3}
              {...register("rt", {
                onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
                  setValue("rt", padRtRw(e.target.value)),
              })}
            />
          </FieldShell>
          <FieldShell label="RW" field="rw" confidences={confidences} errors={errors}>
            <Input
              id="rw"
              inputMode="numeric"
              maxLength={3}
              {...register("rw", {
                onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
                  setValue("rw", padRtRw(e.target.value)),
              })}
            />
          </FieldShell>
          <FieldShell label="Kelurahan / Desa" field="kelurahanDesa" confidences={confidences} errors={errors}>
            <Input id="kelurahanDesa" {...register("kelurahanDesa")} />
          </FieldShell>
          <FieldShell label="Kecamatan" field="kecamatan" confidences={confidences} errors={errors}>
            <Input id="kecamatan" {...register("kecamatan")} />
          </FieldShell>
          <FieldShell label="Provinsi" field="provinsi" confidences={confidences} errors={errors}>
            <Controller
              control={control}
              name="provinsi"
              render={({ field: rhf }) => (
                <Select
                  value={rhf.value || ""}
                  onValueChange={(value) => {
                    rhf.onChange(value);
                    setValue("kabupatenKota", "");
                  }}
                >
                  <SelectTrigger id="provinsi" className="w-full">
                    <SelectValue placeholder="Pilih provinsi" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinsiOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>
          <FieldShell label="Kabupaten / Kota" field="kabupatenKota" confidences={confidences} errors={errors}>
            <SelectField
              field="kabupatenKota"
              options={kabupatenOptions}
              control={control}
              placeholder={kabupatenOptions.length ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"}
            />
          </FieldShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <FieldShell label="Agama" field="agama" confidences={confidences} errors={errors}>
            <SelectField field="agama" options={AGAMA} control={control} />
          </FieldShell>
          <FieldShell label="Status Perkawinan" field="statusPerkawinan" confidences={confidences} errors={errors}>
            <SelectField field="statusPerkawinan" options={STATUS_PERKAWINAN} control={control} />
          </FieldShell>
          <FieldShell label="Pekerjaan" field="pekerjaan" confidences={confidences} errors={errors}>
            <Input id="pekerjaan" {...register("pekerjaan")} />
          </FieldShell>
          <FieldShell label="Kewarganegaraan" field="kewarganegaraan" confidences={confidences} errors={errors}>
            <SelectField field="kewarganegaraan" options={KEWARGANEGARAAN} control={control} />
          </FieldShell>
          <div className="sm:col-span-2">
            <FieldShell label="Berlaku Hingga" field="berlakuHingga" confidences={confidences} errors={errors}>
              <div className="flex flex-wrap gap-2">
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
        <Button type="submit" className="gap-2">
          <Save className="size-4" /> Simpan Data
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={onReset}>
          <RotateCcw className="size-4" /> Kembalikan Hasil OCR
        </Button>
        <Button type="button" variant="ghost" className="gap-2 text-destructive" onClick={onClear}>
          <Trash2 className="size-4" /> Hapus Data
        </Button>
      </div>
    </form>
  );
}
