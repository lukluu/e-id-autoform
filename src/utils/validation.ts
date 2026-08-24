import { z } from "zod";
import {
  AGAMA,
  GOLONGAN_DARAH,
  JENIS_KELAMIN,
  KEWARGANEGARAAN,
  STATUS_PERKAWINAN,
} from "@/types/ktp";

export function isValidNik(nik: string): boolean {
  return /^\d{16}$/.test(nik.trim());
}

/** 1 -> 001, 12 -> 012, 123 -> 123 */
export function padRtRw(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 3);
  if (!digits) return "";
  return digits.padStart(3, "0");
}

/** ISO (YYYY-MM-DD) -> tampilan DD-MM-YYYY */
export function isoToDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** DD-MM-YYYY (atau DD/MM/YYYY) -> ISO */
export function displayDateToIso(value: string): string {
  const match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(value.trim());
  if (!match) return "";
  const [, d, m, y] = match;
  return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}

const optionalUpper = z.string().trim().max(120);

export const ktpSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, { message: "NIK harus 16 digit angka" }),
  nama: z.string().trim().min(2, { message: "Nama wajib diisi" }).max(100),
  provinsi: optionalUpper,
  kabupatenKota: optionalUpper,
  tempatLahir: z.string().trim().max(60),
  tanggalLahir: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Tanggal lahir tidak valid",
    }),
  jenisKelamin: z.enum(["", ...JENIS_KELAMIN]),
  golonganDarah: z.enum(["", ...GOLONGAN_DARAH]),
  alamat: z.string().trim().max(200),
  rt: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,3}$/.test(v), { message: "RT maksimal 3 digit" }),
  rw: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,3}$/.test(v), { message: "RW maksimal 3 digit" }),
  kelurahanDesa: optionalUpper,
  kecamatan: optionalUpper,
  agama: z.enum(["", ...AGAMA]),
  statusPerkawinan: z.enum(["", ...STATUS_PERKAWINAN]),
  pekerjaan: z.string().trim().max(80),
  kewarganegaraan: z.enum(["", ...KEWARGANEGARAAN]),
  berlakuHingga: z.string().trim().max(30),
});

export type KtpFormValues = z.infer<typeof ktpSchema>;
