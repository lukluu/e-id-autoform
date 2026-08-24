import {
  AGAMA,
  GOLONGAN_DARAH,
  JENIS_KELAMIN,
  KEWARGANEGARAAN,
  STATUS_PERKAWINAN,
  emptyKtpData,
  type ConfidenceMap,
  type ConfidenceStatus,
  type KtpData,
  type KtpField,
} from "@/types/ktp";
import { findProvinsiByKabupaten, getProvinsiList } from "@/data/wilayahIndonesia";
import {
  cleanValue,
  matchOption,
  similarity,
  toDigits,
  toLines,
} from "@/utils/textNormalizer";
import { displayDateToIso, isValidNik, padRtRw } from "@/utils/validation";

/** Variasi label yang mungkin muncul dari OCR untuk tiap field. */
const LABELS: Partial<Record<KtpField, string[]>> = {
  nik: ["NIK", "N1K", "NlK", "NIX", "NK"],
  nama: ["NAMA"],
  tempatLahir: ["TEMPAT/TGL LAHIR", "TEMPAT TGL LAHIR", "TEMPATTGL LAHIR", "TMPT/TGL LAHIR"],
  jenisKelamin: ["JENIS KELAMIN", "JENISKELAMIN", "JENIS KELAM1N"],
  golonganDarah: ["GOL DARAH", "GOL. DARAH", "GOLONGAN DARAH", "GDARAH"],
  alamat: ["ALAMAT", "ALAMAI"],
  rt: ["RT/RW", "RTRW", "RT RW"],
  kelurahanDesa: ["KEL/DESA", "KELURAHAN/DESA", "KEL DESA", "KELDESA", "DESA"],
  kecamatan: ["KECAMATAN", "KEC"],
  agama: ["AGAMA"],
  statusPerkawinan: ["STATUS PERKAWINAN", "STATUS PERKAW1NAN", "STATUS"],
  pekerjaan: ["PEKERJAAN", "PEKERJAAM"],
  kewarganegaraan: ["KEWARGANEGARAAN", "KEWARGANEGARAN", "WARGA NEGARA"],
  berlakuHingga: ["BERLAKU HINGGA", "BERLAKUHINGGA", "BERLAKU"],
};

interface ParsedLine {
  label: KtpField | null;
  labelScore: number;
  value: string;
}

function splitLabelValue(line: string): { left: string; right: string } {
  const idx = line.indexOf(":");
  if (idx >= 0) {
    return { left: line.slice(0, idx), right: line.slice(idx + 1) };
  }
  // Tanpa titik dua: coba pisah pada dua spasi berturut-turut
  const m = /^(\S+(?:\s\S+){0,2})\s{2,}(.+)$/.exec(line);
  if (m) return { left: m[1] ?? "", right: m[2] ?? "" };
  return { left: line, right: "" };
}

function detectLabel(left: string): { field: KtpField | null; score: number } {
  const candidate = left
    .toUpperCase()
    .replace(/[^A-Z/ .]/g, "")
    .replace(/\./g, "")
    .trim();
  if (!candidate) return { field: null, score: 0 };
  let best: { field: KtpField; score: number } | null = null;
  for (const [field, variants] of Object.entries(LABELS) as [KtpField, string[]][]) {
    for (const variant of variants) {
      const score = similarity(candidate, variant);
      if (!best || score > best.score) best = { field, score };
    }
  }
  if (!best || best.score < 0.62) return { field: null, score: best?.score ?? 0 };
  return { field: best.field, score: best.score };
}

function parseTempatTglLahir(value: string): { tempat: string; tanggal: string } {
  const clean = cleanValue(value);
  const dateMatch = /(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})/.exec(
    clean.replace(/[Oo]/g, "0"),
  );
  const tanggal = dateMatch
    ? displayDateToIso(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`)
    : "";
  let tempat = clean;
  if (dateMatch) tempat = clean.slice(0, dateMatch.index);
  tempat = cleanValue(tempat.replace(/,$/, "")).toUpperCase();
  return { tempat, tanggal };
}

function statusFromScore(score: number): ConfidenceStatus {
  if (score >= 0.85) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

export interface ParseOutcome {
  data: KtpData;
  confidences: ConfidenceMap;
  warnings: string[];
}

/**
 * Parser cerdas untuk teks OCR KTP Indonesia.
 * Mengenali variasi label, menormalkan nilai, dan memberi skor confidence.
 */
export function parseKtpText(rawText: string, baseConfidence = 0.8): ParseOutcome {
  const lines = toLines(rawText);
  const data: KtpData = { ...emptyKtpData };
  const confidences: ConfidenceMap = {};
  const warnings: string[] = [];

  const set = (field: KtpField, value: string, score: number): void => {
    if (!value) return;
    data[field] = value;
    const confidence = Math.max(0, Math.min(1, score * baseConfidence));
    confidences[field] = { field, confidence, status: statusFromScore(confidence) };
  };

  // Provinsi & kabupaten/kota biasanya berada di 2 baris teratas.
  const header = lines.slice(0, 3);
  for (const line of header) {
    const upper = line.toUpperCase();
    for (const prov of getProvinsiList()) {
      if (similarity(upper.replace(/PROVINSI/g, "").trim(), prov) >= 0.7) {
        set("provinsi", prov, 0.9);
      }
    }
    if (/^(KOTA|KABUPATEN|KAB)\b/.test(upper)) {
      const normalized = upper.replace(/^KAB\b\.?/, "KABUPATEN");
      set("kabupatenKota", cleanValue(normalized), 0.85);
    }
  }

  const parsed: ParsedLine[] = lines.map((line) => {
    const { left, right } = splitLabelValue(line);
    const { field, score } = detectLabel(left);
    return { label: field, labelScore: score, value: cleanValue(right) };
  });

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || !item.label) continue;
    const value = item.value;
    const score = item.labelScore;

    switch (item.label) {
      case "nik": {
        const digits = toDigits(value);
        if (isValidNik(digits)) {
          set("nik", digits, Math.max(score, 0.95));
        } else if (digits) {
          set("nik", digits, 0.45);
          warnings.push(
            `NIK terbaca ${digits.length} digit (seharusnya 16). Mohon periksa kembali.`,
          );
        }
        break;
      }
      case "nama":
        set("nama", cleanValue(value).toUpperCase(), score);
        break;
      case "tempatLahir": {
        const { tempat, tanggal } = parseTempatTglLahir(value);
        set("tempatLahir", tempat, score * 0.95);
        if (tanggal) set("tanggalLahir", tanggal, score);
        else warnings.push("Tanggal lahir tidak terbaca dengan jelas.");
        break;
      }
      case "jenisKelamin": {
        const matched = matchOption(value.split(/GOL/i)[0] ?? value, JENIS_KELAMIN);
        if (matched) set("jenisKelamin", matched, score);
        break;
      }
      case "golonganDarah": {
        const matched = matchOption(value, GOLONGAN_DARAH);
        if (matched) set("golonganDarah", matched, score * 0.8);
        break;
      }
      case "alamat":
        set("alamat", cleanValue(value).toUpperCase(), score);
        break;
      case "rt": {
        const digits = value.replace(/\D+/g, " ").trim().split(/\s+/);
        if (digits[0]) set("rt", padRtRw(digits[0]), score);
        if (digits[1]) set("rw", padRtRw(digits[1]), score);
        break;
      }
      case "kelurahanDesa":
        set("kelurahanDesa", cleanValue(value).toUpperCase(), score);
        break;
      case "kecamatan":
        set("kecamatan", cleanValue(value).toUpperCase(), score);
        break;
      case "agama": {
        const matched = matchOption(value, AGAMA);
        if (matched) set("agama", matched, score);
        break;
      }
      case "statusPerkawinan": {
        const matched = matchOption(value, STATUS_PERKAWINAN);
        if (matched) set("statusPerkawinan", matched, score);
        break;
      }
      case "pekerjaan":
        set("pekerjaan", cleanValue(value).toUpperCase(), score);
        break;
      case "kewarganegaraan": {
        const matched = matchOption(value, KEWARGANEGARAAN);
        if (matched) set("kewarganegaraan", matched, score);
        break;
      }
      case "berlakuHingga": {
        const upper = cleanValue(value).toUpperCase();
        if (similarity(upper, "SEUMUR HIDUP") >= 0.6) {
          set("berlakuHingga", "SEUMUR HIDUP", score);
        } else {
          const m = /(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})/.exec(upper);
          if (m) set("berlakuHingga", `${m[1]}-${m[2]}-${m[3]}`, score);
        }
        break;
      }
      default:
        break;
    }
  }

  if (!data.provinsi && data.kabupatenKota) {
    const prov = findProvinsiByKabupaten(data.kabupatenKota);
    if (prov) set("provinsi", prov, 0.7);
  }

  if (!data.nik) warnings.push("NIK tidak terbaca. Silakan isi manual.");
  if (!data.nama) warnings.push("Nama tidak terbaca. Silakan isi manual.");
  const filled = Object.values(data).filter(Boolean).length;
  if (filled < 4) {
    warnings.push(
      "Sebagian besar data gagal dibaca. Pastikan gambar tajam, terang, dan memang gambar KTP.",
    );
  }

  return { data, confidences, warnings };
}
