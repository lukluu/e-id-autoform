/** Utilitas normalisasi teks hasil OCR. */

const DIGIT_LOOKALIKE: Record<string, string> = {
  O: "0",
  o: "0",
  I: "1",
  i: "1",
  l: "1",
  L: "1",
  "|": "1",
  S: "5",
  s: "5",
  B: "8",
};

/**
 * Extended mapping used ONLY when we know the context is numeric (NIK, RT/RW).
 * Includes aggressive substitutions that would corrupt text fields.
 */
const DIGIT_LOOKALIKE_AGGRESSIVE: Record<string, string> = {
  ...DIGIT_LOOKALIKE,
  D: "0",
  d: "0",
  Q: "0",
  q: "9",
  Z: "2",
  z: "2",
  G: "6",
  g: "9",
  b: "6",
  T: "7",
  t: "7",
  A: "4",
  a: "4",
  F: "7",
  f: "7",
  H: "4",
  h: "4",
  "?": "7",
  "/": "7",
  ">": "7",
  "%": "1",
  "&": "8",
  $: "5",
  "!": "1",
  "]": "1",
  "[": "1",
  "}": "1",
  "{": "1",
  ")": "1",
  "(": "1",
};

const LETTER_LOOKALIKE: Record<string, string> = {
  "0": "O",
  "1": "I",
  "5": "S",
  "8": "B",
  "4": "A",
  "6": "G",
};

/** Hapus karakter aneh, rapatkan spasi, dan seragamkan huruf besar. */
export function normalizeLine(line: string): string {
  return line
    .replace(/[^\p{L}\p{N}\s:,./=|'"()-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pisahkan teks OCR menjadi baris-baris bersih. */
export function toLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((l) => l.length > 1);
}

/** Ubah karakter mirip angka menjadi angka, lalu buang non-digit. */
export function toDigits(value: string): string {
  return value
    .split("")
    .map((c) => (/\d/.test(c) ? c : (DIGIT_LOOKALIKE[c] ?? c)))
    .join("")
    .replace(/\D/g, "");
}

/**
 * Versi agresif dari toDigits — gunakan hanya ketika konteks pasti numerik
 * (NIK, RT/RW). Mapping A→4, T→7, dll. akan merusak field teks.
 */
export function toDigitsAggressive(value: string): string {
  return value
    .split("")
    .map((c) => (/\d/.test(c) ? c : (DIGIT_LOOKALIKE_AGGRESSIVE[c] ?? c)))
    .join("")
    .replace(/\D/g, "");
}

/** Ubah angka yang seharusnya huruf (umum pada nama/tempat). */
export function toLetters(value: string): string {
  return value
    .split("")
    .map((c) => LETTER_LOOKALIKE[c] ?? c)
    .join("");
}

/** Bersihkan nilai field: buang sisa titik dua, tanda kutip, tanda baca menggantung. */
export function cleanValue(value: string): string {
  return value
    .replace(/^[\s:;.\-–—|=“"”'‘`]+/, "")
    .replace(/[\s:;.\-–—|=“"”'‘`]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kemiripan sederhana (Levenshtein ternormalisasi) untuk mencocokkan label. */
export function similarity(a: string, b: string): number {
  const s = a.toUpperCase();
  const t = b.toUpperCase();
  if (s === t) return 1;
  if (!s.length || !t.length) return 0;
  const w = t.length + 1;
  const d = new Uint32Array((s.length + 1) * w);
  for (let i = 0; i <= s.length; i++) d[i * w] = i;
  for (let j = 0; j <= t.length; j++) d[j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i * w + j] = Math.min(
        d[(i - 1) * w + j]! + 1,
        d[i * w + j - 1]! + 1,
        d[(i - 1) * w + j - 1]! + cost,
      );
    }
  }
  return 1 - d[s.length * w + t.length]! / Math.max(s.length, t.length);
}

/** Cocokkan sebuah nilai ke daftar opsi yang diperbolehkan. */
export function matchOption(value: string, options: readonly string[]): string | undefined {
  const clean = cleanValue(value).toUpperCase();
  if (!clean) return undefined;
  const exactToken = options.find((option) => {
    const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`).test(clean);
  });
  if (exactToken) return exactToken;
  let best: { option: string; score: number } | undefined;
  for (const option of options) {
    const score = similarity(clean, option);
    if (!best || score > best.score) best = { option, score };
  }
  return best && best.score >= 0.6 ? best.option : undefined;
}
