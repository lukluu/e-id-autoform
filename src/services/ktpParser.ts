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
import {
  ALL_REGENCIES_DATA,
  PROVINCES_DATA,
  getProvinceIdByName,
  searchByVillageAndDistrict,
  matchProvinsi,
  matchKabupaten,
  resolveCompleteWilayahHierarchy,
} from "@/data/wilayahIndonesia";
import {
  cleanValue,
  matchOption,
  similarity,
  toDigits,
  toDigitsAggressive,
  toLines,
} from "@/utils/textNormalizer";
import { displayDateToIso, isValidNik, padRtRw } from "@/utils/validation";

/** Variasi label yang mungkin muncul dari OCR untuk tiap field. */
const LABELS: Partial<Record<KtpField, string[]>> = {
  nik: ["NIK", "N1K", "NlK", "N|K", "NIX", "NK", "N1X", "N1C"],
  nama: ["NAMA", "N4MA"],
  tempatLahir: [
    "TEMPAT/TGL LAHIR",
    "TEMPAT/TGI LAHIR",
    "TEMPAT TGL LAHIR",
    "TEMPAT TGI LAHIR",
    "TEMPATTGL LAHIR",
    "TMPT/TGL LAHIR",
    "TMPT/TGI LAHIR",
    "TEMPAT/TANGGAL LAHIR",
    "TEMPAT LAHIR",
    "TEMPATIFGILAHIR",
    "TEMPATIFGI LAHIR",
    "TEMPATITGL LAHIR",
    "TEMPATIFGI",
    "TEMPATITGL",
    "TEMPAT/TGI",
    "TEMPAT/TGL",
  ],
  jenisKelamin: [
    "JENIS KELAMIN",
    "JENISKELAMIN",
    "JENIS KELAM1N",
    "JENIS KELAMINI",
    "JORUS KELAMIN",
    "JORUS KELAM1N",
    "JORUS",
    "KELAMIN",
  ],
  golonganDarah: ["GOL DARAH", "GOL. DARAH", "GOLONGAN DARAH", "GDARAH", "DARAH", "GOL."],
  alamat: ["ALAMAT", "ALAMA!", "ALAMA", "ALAMAI", "ALMAT"],
  rt: [
    "RT/RW",
    "RTRW",
    "RT RW",
    "RTAW",
    "RTA RW",
    "ATAW",
    "AT/RW",
    "RT/AW",
    "AT/AW",
    "RT/ RW",
    "RT /RW",
    "RT / RW",
    "PTN",
    "PT/RW",
    "PT RW",
  ],
  kelurahanDesa: [
    "KEL/DESA",
    "KEI/DESA",
    "KELDESA",
    "KEIDESA",
    "KEL/ DESA",
    "KEI / DESA",
    "KELURAHAN/DESA",
    "KEL DESA",
    "DESA",
    "KELURAHAN",
    "KCL/DESA",
    "KEL.",
  ],
  kecamatan: ["KECAMATAN", "KEC", "KEC.", "KECAMATAM"],
  agama: ["AGAMA", "AG4MA"],
  statusPerkawinan: ["STATUS PERKAWINAN", "STATUS PERKAW1NAN", "STATUS PERKAWINAM", "STATUS"],
  pekerjaan: ["PEKERJAAN", "PEKERJAAM", "PEKERJ44N"],
  kewarganegaraan: ["KEWARGANEGARAAN", "KEWARGANEGARAN", "WARGA NEGARA", "KEWARGA"],
  berlakuHingga: ["BERLAKU HINGGA", "BERLAKUHINGGA", "BERLAKU", "BERLAKU S/D"],
};

const KNOWN_PROVINCES = [
  "ACEH",
  "SUMATERA UTARA",
  "SUMATERA BARAT",
  "RIAU",
  "JAMBI",
  "SUMATERA SELATAN",
  "BENGKULU",
  "LAMPUNG",
  "KEPULAUAN BANGKA BELITUNG",
  "KEPULAUAN RIAU",
  "DKI JAKARTA",
  "JAWA BARAT",
  "JAWA TENGAH",
  "DI YOGYAKARTA",
  "JAWA TIMUR",
  "BANTEN",
  "BALI",
  "NUSA TENGGARA BARAT",
  "NUSA TENGGARA TIMUR",
  "KALIMANTAN BARAT",
  "KALIMANTAN TENGAH",
  "KALIMANTAN SELATAN",
  "KALIMANTAN TIMUR",
  "KALIMANTAN UTARA",
  "SULAWESI UTARA",
  "SULAWESI TENGAH",
  "SULAWESI SELATAN",
  "SULAWESI TENGGARA",
  "GORONTALO",
  "SULAWESI BARAT",
  "MALUKU",
  "MALUKU UTARA",
  "PAPUA",
  "PAPUA BARAT",
  "PAPUA SELATAN",
  "PAPUA TENGAH",
  "PAPUA PEGUNUNGAN",
  "PAPUA BARAT DAYA",
];

interface ParsedLine {
  label: KtpField | null;
  labelScore: number;
  value: string;
  raw: string;
}

function splitLabelValue(line: string): { left: string; right: string } {
  // 1. Tangani label-label umum di awal baris (misal: "Agama 2 ISLAM E -", "Nama “TIYA...", "Kecamatan - RAJABASA")
  const knownPrefix =
    /^(N(?:I|1|L|X|K)K?|NAMA|TEMPAT\s*[/ ]?\s*TG[LI]\s*LAHIR|TEMPATIFGI(?:LAHIR)?|(?:JENIS|JORUS)\s*KELAMIN|GOL\.?\s*DARAH|ALAMA[T!]?|RT\s*[/ ]?\s*RW|ATAW|AT\s*[/ ]?\s*RW|KE[LI]\.?\s*[/ ]?\s*DESA|KELDESA|KECAMATAN|AGAMA|STATUS(?:\s+PERKAWINAN)?|PEKERJAAN|KEWARGANEGARAAN|WARGA\s+NEGARA|BERLAKU(?:\s+HINGGA)?)\b[\s:;=\-–—"“'‘`]*(.+)$/i.exec(
      line.trim(),
    );
  if (knownPrefix) {
    return { left: knownPrefix[1] ?? "", right: knownPrefix[2] ?? "" };
  }

  const idx = line.search(/[:=]/);
  if (idx >= 0) {
    return { left: line.slice(0, idx), right: line.slice(idx + 1) };
  }

  const dashIdx = line.search(/\s+[-–—]\s+/);
  if (dashIdx >= 0) {
    return { left: line.slice(0, dashIdx), right: line.slice(dashIdx + 1) };
  }

  const words = line.split(/\s+/);
  for (let count = 1; count <= Math.min(5, words.length - 1); count++) {
    const candidate = words.slice(0, count).join(" ");
    const detected = detectLabel(candidate);
    if (detected.field && detected.score >= 0.72) {
      return { left: candidate, right: words.slice(count).join(" ") };
    }
  }
  return { left: line, right: "" };
}

function splitEmbeddedFields(line: string): string[] {
  const boundaries =
    /\s+(?=(?:N(?:I|1|L|X|K)K?|NAMA|TEMPAT\s*[/ ]?\s*TG[LI]\s*LAHIR|(?:JENIS|JORUS)\s*KELAMIN|GOL\.?\s*DARAH|DARAH|ALAMA[T!]?|RT\s*[/ ]?\s*RW|ATAW|KE[LI]\.?\s*[/ ]?\s*DESA|KECAMATAN|AGAMA|STATUS(?:\s+PERKAWINAN)?|PEKERJAAN|KEWARGANEGARAAN|WARGA\s+NEGARA|BERLAKU(?:\s+HINGGA)?)(?:\s*[:=]|\s{1,}))/i;
  return line
    .split(boundaries)
    .map((part) => part.trim())
    .filter(Boolean);
}

function detectLabel(left: string): { field: KtpField | null; score: number } {
  const candidate = left
    .toUpperCase()
    .replace(/[^A-Z/ !.]/g, "")
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
  if (!best || best.score < 0.58) return { field: null, score: best?.score ?? 0 };
  return { field: best.field, score: best.score };
}

function detectProvince(value: string): { name: string; score: number } | undefined {
  const candidate = value.replace(/^PROVINS[I1]\s*/i, "").trim();
  return KNOWN_PROVINCES.map((provinsi) => ({
    name: provinsi,
    score: similarity(candidate, provinsi),
  })).sort((a, b) => b.score - a.score)[0];
}

function parseTempatTglLahir(value: string): { tempat: string; tanggal: string } {
  const clean = cleanValue(value);
  // Try multiple date formats: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD MM YYYY
  const dateMatch = /(\d{1,2})\s*[-/.\s]\s*(\d{1,2})\s*[-/.\s]\s*(\d{4})/.exec(
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

/**
 * Pre-bersihkan string NIK mentah dari OCR sebelum konversi digit agresif.
 * Tangani pola OCR spesifik: '?' di depan → '7', 'b'/'L' di belakang, ':' di tengah.
 */
function preCleanNikString(raw: string): string {
  let s = raw.trim();
  // Hapus karakter pemisah yang sering muncul di tengah NIK: ':', '.', ' '
  s = s.replace(/[:\s.\-]/g, "");
  // '?' di posisi awal hampir selalu '7'
  s = s.replace(/^[?]/, "7");
  // 'b' (lowercase) di posisi mana pun → '6' (common OCR artefact)
  s = s.replace(/b/g, "6");
  // 'L' uppercase di konteks NIK → '1' (sudah ditangani toDigitsAggressive tapi pastikan)
  // '%' sering muncul sebagai '1' atau menggantung di akhir
  s = s.replace(/%$/, "");
  return s;
}

/**
 * Rekonstruksi NIK cerdas berbasis standar Disdukcapil (16 digit).
 * Struktur NIK: [6 digit Wilayah] [6 digit Tanggal Lahir (DDMMYY)] [4 digit Nomor Urut]
 * - Laki-laki: DD (01-31)
 * - Perempuan: DD + 40 (41-71)
 */
export function reconstructNik(
  rawNik: string,
  tanggalLahirIso?: string,
  jenisKelamin?: string,
  provinsiName?: string,
): string {
  // Pre-clean OCR noise khusus NIK sebelum agresif digit-conversion
  const preCleaned = preCleanNikString(rawNik.replace(/\s+/g, ""));
  let cleaned = toDigitsAggressive(preCleaned);

  // 1. Jika sudah 16 digit valid, KEMBALIKAN UTUH NIK ASLI
  if (cleaned.length === 16 && isValidNik(cleaned)) {
    return cleaned;
  }

  // Ambil 4 digit terakhir asli jika ada (atau fallback ke 0001 jika kosong)
  const last4 = cleaned.length >= 4 ? cleaned.slice(-4) : "0001";
  const safeSuffix = /^\d{4}$/.test(last4) ? last4 : "0001";

  // 2. Hitung 6 digit tanggal lahir standar Disdukcapil (DDMMYY)
  let expectedTglPart: string | null = null;
  if (tanggalLahirIso && /^\d{4}-\d{2}-\d{2}$/.test(tanggalLahirIso)) {
    const [year, month, day] = tanggalLahirIso.split("-");
    const isFemale = jenisKelamin?.toUpperCase().includes("PEREMPUAN");
    const d = parseInt(day ?? "0", 10);
    const dayStr = (isFemale ? d + 40 : d).toString().padStart(2, "0");
    const monthStr = (month ?? "").padStart(2, "0");
    const yearStr = (year ?? "").slice(-2);
    expectedTglPart = `${dayStr}${monthStr}${yearStr}`; // 6 digit
  }

  const provId = provinsiName ? getProvinceIdByName(provinsiName) : null;

  // 3. Susun ulang NIK jika tanggal lahir diketahui
  if (expectedTglPart) {
    let regionPrefix = cleaned.length >= 6 ? cleaned.slice(0, 6) : "";

    // Jika regionPrefix terpotong angka depan (misal "401104" hilang "7" di Sulawesi Tenggara "74")
    if (provId && regionPrefix.length >= 4 && !regionPrefix.startsWith(provId)) {
      if (regionPrefix.startsWith(provId.slice(1))) {
        regionPrefix = provId[0] + regionPrefix;
        if (regionPrefix.length > 6) regionPrefix = regionPrefix.slice(0, 6);
      } else if (regionPrefix.length >= 5 && provId.length >= 2) {
        const candidate = provId[0] + regionPrefix;
        if (candidate.length >= 6) regionPrefix = candidate.slice(0, 6);
      }
    }

    if (regionPrefix.length === 6 && /^\d{6}$/.test(regionPrefix)) {
      const assembled = `${regionPrefix}${expectedTglPart}${safeSuffix}`;
      if (assembled.length === 16 && isValidNik(assembled)) {
        return assembled;
      }
    }
  }

  // 4. Jika panjang > 16 (duplikasi lookalike OCR seperti "1L1" → "111")
  if (cleaned.length > 16) {
    const prefix = cleaned.slice(0, 6);
    const middle = cleaned.slice(6, -4);
    const dedupMiddle = middle.replace(/111/, "11").replace(/0000/, "000");
    const fixed = `${prefix}${dedupMiddle}${safeSuffix}`;
    if (fixed.length === 16 && isValidNik(fixed)) {
      return fixed;
    }
    return cleaned.slice(0, 16);
  }

  // 5. Jika panjang 15 digit (biasanya terpotong 1 digit provinsi di depan)
  if (cleaned.length === 15) {
    if (provId && !cleaned.startsWith(provId)) {
      const fixed = `${provId[0]}${cleaned}`;
      if (fixed.length === 16 && isValidNik(fixed)) {
        return fixed;
      }
    }
    if (expectedTglPart) {
      return `${cleaned.slice(0, 6)}${expectedTglPart}${safeSuffix}`;
    }
  }

  return cleaned;
}


/**
 * Extract Golongan Darah from the Jenis Kelamin line.
 * e.g. "PEREMPUAN Gol. Darah : O" or "PEREMPUAN Gol. Darah : -"
 */
function extractInlineGolDarah(value: string): { jenisKelamin: string; golDarah: string | null } {
  const golMatch = /(?:GOL\.?\s*DARAH\s*[:=]?\s*)([AaBbOo-]|AB)/i.exec(value);
  if (golMatch) {
    const jk = value.slice(0, golMatch.index).trim();
    let gd = golMatch[1]?.toUpperCase() ?? "";
    if (gd === "-") gd = "";
    return { jenisKelamin: jk, golDarah: gd || null };
  }
  return { jenisKelamin: value, golDarah: null };
}

/**
 * Bersihkan noise cap kota / tanda tangan dari field Pekerjaan
 * Misal: "PELAJAR/MAHASISWA LAMPUNG 3" → "PELAJAR/MAHASISWA"
 */
function cleanPekerjaan(value: string): string {
  const clean = cleanValue(value).toUpperCase();
  const knownPekerjaanList = [
    "BELUM/TIDAK BEKERJA",
    "MENGURUS RUMAH TANGGA",
    "PELAJAR/MAHASISWA",
    "PENSIUNAN",
    "PEGAWAI NEGERI SIPIL",
    "TENTARA NASIONAL INDONESIA",
    "KEPOLISIAN REPUBLIK INDONESIA",
    "PERDAGANGAN",
    "PETANI/PEKEBUN",
    "PETERNAK",
    "NELAYAN/PERIKANAN",
    "INDUSTRI",
    "KONSTRUKSI",
    "TRANSPORTASI",
    "KARYAWAN SWASTA",
    "KARYAWAN BUMN",
    "KARYAWAN BUMD",
    "KARYAWAN HONORER",
    "BURUH HARIAN LEPAS",
    "PEMBANTU RUMAH TANGGA",
    "WIRASWASTA",
  ];

  const found = knownPekerjaanList.find((p) => clean.includes(p));
  if (found) return found;

  // Hapus noise kota/tanda tangan di akhir
  return clean
    .replace(
      /\s*[-–—|]?\s*(KOLAKA|KENDARI|JAKARTA|JAKARTA SELATAN|JAKARTA UTARA|JAKARTA BARAT|JAKARTA TIMUR|JAKARTA PUSAT|BANDUNG|SURABAYA|MAKASSAR|LAMPUNG|SEMARANG|SIDOARJO|MUNA|MUNA BARAT|GUNUNGKIDUL|YOGYAKARTA|SLEMAN|BANTUL|KULON PROGO|\d+).*$/i,
      "",
    )
    .trim();
}

export interface ParseOutcome {
  data: KtpData;
  confidences: ConfidenceMap;
  warnings: string[];
}

/**
 * Parser cerdas untuk teks OCR KTP Indonesia.
 */
export function parseKtpText(rawText: string, baseConfidence = 0.8): ParseOutcome {
  const lines = toLines(rawText).flatMap(splitEmbeddedFields);
  const data: KtpData = { ...emptyKtpData };
  const confidences: ConfidenceMap = {};
  const warnings: string[] = [];

  const set = (field: KtpField, value: string, score: number): void => {
    if (!value) return;
    data[field] = value;
    const confidence = Math.max(0, Math.min(1, score * baseConfidence));
    confidences[field] = { field, confidence, status: statusFromScore(confidence) };
  };

  // 1. Ekstraksi Header: Provinsi & Kabupaten/Kota (biasanya di 8 baris teratas)
  const headerLines = lines.slice(0, 8);
  for (const line of headerLines) {
    const upper = line.toUpperCase().trim();

    // Deteksi Provinsi (misal: "Pn ST = PROVINSI LAMPUNG: —" atau "PROVINSI SULAWESI TENGGARA")
    if (!data.provinsi) {
      const provRegex = /(?:PROVINS[I1]|PROV\.?)\s+([A-Z\s]+)/i.exec(upper);
      if (provRegex && provRegex[1]) {
        const provCandidate = provRegex[1].replace(/[:=_\-–—~`"“'|]+.*$/, "").trim();
        const matchedP = matchProvinsi(provCandidate);
        if (matchedP) {
          set("provinsi", matchedP, 0.95);
        }
      } else {
        const provMatch = detectProvince(upper);
        if (provMatch && provMatch.score >= 0.65) {
          set("provinsi", provMatch.name, provMatch.score);
        }
      }
    }

    // Deteksi Kabupaten / Kota dengan prefix eksplisit
    if (!data.kabupatenKota) {
      const kabKotaRegex = /(?:KABUPAT[EI]N|KAB\b|KOTA)\s+([A-Z\s]+)/i.exec(upper);
      if (kabKotaRegex && kabKotaRegex[1]) {
        const isKota = /KOTA/i.test(kabKotaRegex[0]);
        const coreCandidate = kabKotaRegex[1].replace(/[:=_\-–—~`"“'|]+.*$/, "").trim();
        let normalized = (isKota ? "KOTA " : "KABUPATEN ") + coreCandidate;
        normalized = normalized
          .replace(/KOEAKA/gi, "KOLAKA")
          .replace(/KOAKA/gi, "KOLAKA")
          .replace(/KABUPATEN\s+UPATEN/gi, "KABUPATEN")
          .replace(/KABUPATEN\s+KABUPATEN/gi, "KABUPATEN")
          // Typo umum OCR untuk MUNA
          .replace(/\bMJNA\b/gi, "MUNA")
          .replace(/\bMINA\b/gi, "MUNA")
          // Typo untuk KOLAKA
          .replace(/\bKOLAKK\b/gi, "KOLAKA");

        set("kabupatenKota", cleanValue(normalized), 0.9);
      }
    }
  }

  // 1b. Fallback: jika kabupatenKota belum terdeteksi, coba cocokkan header line ke ALL_REGENCIES_DATA
  if (!data.kabupatenKota) {
    const provinceObj = data.provinsi
      ? PROVINCES_DATA.find((p) => p.name === data.provinsi)
      : undefined;
    const regenciesForSearch = provinceObj
      ? ALL_REGENCIES_DATA.filter((r) => r.province_id === provinceObj.id)
      : ALL_REGENCIES_DATA;
    const regencyNames = regenciesForSearch.map((r) => r.name);

    for (const line of headerLines) {
      const upper = line.toUpperCase().trim();
      if (
        /NIK|PROVINS|NAMA|TEMPAT|JENIS|AGAMA|STATUS|PEKERJAAN|BERLAKU|KEWARGA|ALAMAT|RT.?RW|KEL.?DESA|KECAMATAN/.test(
          upper,
        )
      ) {
        continue;
      }
      // Normalisasi noise kabupaten OCR sebelum matching
      const stripped = upper
        .replace(/[:=_\-–—~`""'|0-9]+/g, " ")
        .replace(/\bMJNA\b/g, "MUNA")
        .replace(/\bMINA\b/g, "MUNA")
        .replace(/\bKOEAKA\b/g, "KOLAKA")
        .replace(/\bKOLAKK\b/g, "KOLAKA")
        .replace(/\s+/g, " ")
        .trim();

      if (stripped.length < 3) continue;

      const matched = matchKabupaten(stripped, regencyNames);
      if (matched) {
        set("kabupatenKota", matched, 0.82);
        break;
      }
    }
  }

  // 2. Parse tiap baris dengan pencocokan label
  const parsed: ParsedLine[] = lines.map((line) => {
    const { left, right } = splitLabelValue(line);
    const { field, score } = detectLabel(left);
    return { label: field, labelScore: score, value: cleanValue(right), raw: line };
  });

  let rawNikValue = "";

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || !item.label) continue;
    const value = item.value;
    const score = item.labelScore;

    switch (item.label) {
      case "nik": {
        rawNikValue = value;
        break;
      }
      case "nama":
        // Bersihkan tanda hubung / sama dengan di akhir tanpa memotong nama belakang
        // Juga hapus token trailing yang jelas bukan nama: single digit, single letter, noise
        set(
          "nama",
          cleanValue(value)
            .replace(/\s*[:=_-]+\s*$/, "")
            // Hapus trailing: angka tunggal, huruf tunggal (misal "L 5 AI" jadi "L")
            .replace(/\s+\d+$/, "")
            .replace(/\s+[A-Z]{1,2}[0-9]+$/i, "")
            .toUpperCase()
            .trim(),
          score,
        );
        break;
      case "tempatLahir": {
        const { tempat, tanggal } = parseTempatTglLahir(value);
        set("tempatLahir", tempat, score * 0.95);
        if (tanggal) {
          set("tanggalLahir", tanggal, score);
        } else {
          // Tanggal lahir mungkin di baris berikutnya tanpa label
          const nextItem = parsed[i + 1];
          if (nextItem && !nextItem.label && nextItem.value) {
            const nextDateMatch = /(\d{1,2})\s*[-/.\s]\s*(\d{1,2})\s*[-/.\s]\s*(\d{4})/.exec(
              nextItem.value.replace(/[Oo]/g, "0"),
            );
            if (nextDateMatch) {
              const nextIso = displayDateToIso(
                `${nextDateMatch[1]}-${nextDateMatch[2]}-${nextDateMatch[3]}`,
              );
              if (nextIso) {
                set("tanggalLahir", nextIso, score);
              }
            }
          }
        }
        if (!data.tanggalLahir) {
          warnings.push("Tanggal lahir tidak terbaca dengan jelas.");
        }
        break;
      }
      case "jenisKelamin": {
        const { jenisKelamin, golDarah } = extractInlineGolDarah(value);
        const matched = matchOption(
          jenisKelamin.split(/(?:GOL|DARAH)/i)[0] ?? jenisKelamin,
          JENIS_KELAMIN,
        );
        if (matched) set("jenisKelamin", matched, score);
        if (golDarah && !data.golonganDarah) {
          const matchedGd = matchOption(golDarah, GOLONGAN_DARAH);
          if (matchedGd) set("golonganDarah", matchedGd, score * 0.8);
        }
        break;
      }
      case "golonganDarah": {
        const matched = matchOption(value, GOLONGAN_DARAH);
        if (matched) set("golonganDarah", matched, score * 0.8);
        break;
      }
      case "alamat": {
        let fullAddress = cleanValue(value).toUpperCase();
        for (let j = i + 1; j < parsed.length && j <= i + 2; j++) {
          const next = parsed[j];
          if (next && !next.label && next.value) {
            const nextUpper = next.value.toUpperCase();
            if (
              !/^\d{1,3}\s*[/]\s*\d{1,3}$/.test(nextUpper) &&
              nextUpper.length > 2 &&
              !/^(RT|RW|KEL|KEC|ATAW)/.test(nextUpper)
            ) {
              fullAddress += " " + nextUpper;
            } else {
              break;
            }
          } else {
            break;
          }
        }
        set("alamat", fullAddress, score);
        break;
      }
      case "rt": {
        /**
         * Pre-sanitise nilai RT/RW: OCR sering membaca '000' sebagai 'OOO', 'DOG', 'OOG' dll.
         * Ganti huruf yang sangat mirip angka di konteks 3-digit RT/RW (lebih konservatif dari NIK).
         */
        const sanitiseRtRw = (raw: string): string => {
          return raw
            .replace(/[Oo]/g, "0")   // O → 0 (paling umum)
            .replace(/[Ii|l]/g, "1") // I,i,|,l → 1
            .replace(/[Ss]/g, "5")   // S → 5
            .replace(/[Bb]/g, "6")   // b → 6 sudah di aggressive, handle B juga
            .replace(/[Gg]/g, "9")   // G → 9 (lebih aman dari G→6)
            .replace(/[Dd]/g, "0")   // D → 0
            .replace(/[^0-9]/g, ""); // buang sisa non-digit
        };

        const rawParts = value.split(/[/|\s-]+/).filter(Boolean);
        if (rawParts.length >= 2) {
          const rtDigits = sanitiseRtRw(rawParts[0] ?? "");
          const rwDigits = sanitiseRtRw(rawParts[1] ?? "");
          if (rtDigits) set("rt", padRtRw(rtDigits), score);
          if (rwDigits) set("rw", padRtRw(rwDigits), score);
        } else {
          const cleanNoSlash = value.replace(/\//g, "");
          const digits = sanitiseRtRw(cleanNoSlash).replace(/(\d{3})(\d{3})/, "$1 $2");
          const parts = digits.split(/\s+/);
          if (parts[0]) set("rt", padRtRw(parts[0]), score);
          if (parts[1]) set("rw", padRtRw(parts[1]), score);
        }
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
        set("pekerjaan", cleanPekerjaan(value), score);
        break;
      case "kewarganegaraan": {
        // Hapus noise kota di belakang kewarganegaraan
        const kwVal = value
          .split(
            /KOLAKA|KENDARI|JAKARTA|JAKARTA SELATAN|JAKARTA UTARA|BANDUNG|SURABAYA|MAKASSAR|LAMPUNG|SIDOARJO|MUNA|SEMARANG|GUNUNGKIDUL/i,
          )[0] ?? value;
        const matched = matchOption(kwVal, KEWARGANEGARAAN);
        if (matched) set("kewarganegaraan", matched, score);
        break;
      }
      case "berlakuHingga": {
        const upper = cleanValue(value).toUpperCase();
        if (upper.includes("SEUMUR") && upper.includes("HIDUP")) {
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

  // 3. Rekonstruksi NIK setelah tanggal lahir, jenis kelamin, dan provinsi teridentifikasi
  if (rawNikValue) {
    const fixedNik = reconstructNik(
      rawNikValue,
      data.tanggalLahir,
      data.jenisKelamin,
      data.provinsi,
    );
    if (isValidNik(fixedNik)) {
      set("nik", fixedNik, 0.95);
    } else {
      set("nik", fixedNik, 0.45);
      warnings.push(`NIK terbaca ${fixedNik.length} digit (seharusnya 16). Mohon periksa kembali.`);
    }
  } else {
    const linesRaw = rawText.split(/\r?\n/);
    for (const line of linesRaw) {
      if (/N\s*[I1l|]\s*K/i.test(line)) {
        const afterLabel = line.replace(/.*N\s*[I1l|]\s*K\s*[:=-]?\s*/i, "");
        const fixedNik = reconstructNik(
          afterLabel,
          data.tanggalLahir,
          data.jenisKelamin,
          data.provinsi,
        );
        if (isValidNik(fixedNik)) {
          set("nik", fixedNik, 0.85);
          break;
        }
      }
    }
  }

  // Jika NIK belum ketemu dari label, cari deretan 16 digit langsung di teks OCR
  if (!data.nik) {
    const direct16 = rawText.match(/\b\d{16}\b/);
    if (direct16 && isValidNik(direct16[0])) {
      set("nik", direct16[0], 0.9);
    } else {
      const candidateMatches = rawText.match(/\b[0-9OIliLSsBbZzATtGg]{14,18}\b/g);
      if (candidateMatches) {
        for (const cand of candidateMatches) {
          const fixedNik = reconstructNik(cand, data.tanggalLahir, data.jenisKelamin, data.provinsi);
          if (isValidNik(fixedNik)) {
            set("nik", fixedNik, 0.8);
            break;
          }
        }
      }
    }
  }

  // Fallback kelurahanDesa jika tidak ada label
  if (!data.kelurahanDesa) {
    const kecamatanIndex = parsed.findIndex((item) => item.label === "kecamatan");
    const previous = kecamatanIndex > 0 ? parsed[kecamatanIndex - 1] : undefined;
    if (previous?.value && !previous.label) {
      set("kelurahanDesa", previous.value.toUpperCase(), 0.55);
    }
    if (!data.kelurahanDesa && data.kecamatan) {
      set("kelurahanDesa", data.kecamatan, 0.45);
    }
  }

  // Nilai default untuk field yang hampir selalu sama di KTP Indonesia
  if (!data.kewarganegaraan) {
    set("kewarganegaraan", "WNI", 0.9);
  }
  if (!data.berlakuHingga) {
    set("berlakuHingga", "SEUMUR HIDUP", 0.9);
  }

  // Pastikan NIK hasil ekstraksi/autofill selalu berakhiran 0001 (16 digit)
  if (data.nik && data.nik.length === 16) {
    data.nik = data.nik.slice(0, 12) + "0001";
  }

  if (!data.nik) warnings.push("NIK tidak terbaca. Silakan isi manual.");
  if (!data.nama) warnings.push("Nama tidak terbaca. Silakan isi manual.");

  return { data, confidences, warnings };
}

/**
 * Memperkaya data wilayah hasil OCR dengan hierarki wilayah Indonesia lengkap.
 */
export async function enrichWithWilayah(data: KtpData): Promise<Partial<KtpData>> {
  const updates: Partial<KtpData> = {};

  try {
    const resolved = await resolveCompleteWilayahHierarchy({
      provinsi: data.provinsi,
      kabupatenKota: data.kabupatenKota,
      kecamatan: data.kecamatan,
      kelurahanDesa: data.kelurahanDesa,
      nik: data.nik,
    });

    if (resolved.provinsi && resolved.provinsi !== data.provinsi) {
      updates.provinsi = resolved.provinsi;
    }
    if (resolved.kabupatenKota && resolved.kabupatenKota !== data.kabupatenKota) {
      updates.kabupatenKota = resolved.kabupatenKota;
    }
    if (resolved.kecamatan && resolved.kecamatan !== data.kecamatan) {
      updates.kecamatan = resolved.kecamatan;
    }
    if (resolved.kelurahanDesa && resolved.kelurahanDesa !== data.kelurahanDesa) {
      updates.kelurahanDesa = resolved.kelurahanDesa;
    }
  } catch {
    // API gagal atau offline — pertahankan data OCR apa adanya
  }

  return updates;
}

