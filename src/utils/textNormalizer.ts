/** Utilitas normalisasi teks hasil OCR. */

const DIGIT_LOOKALIKE: Record<string, string> = {
  O: "0",
  o: "0",
  D: "0",
  Q: "0",
  I: "1",
  i: "1",
  l: "1",
  L: "1",
  "|": "1",
  Z: "2",
  z: "2",
  S: "5",
  s: "5",
  B: "8",
  G: "6",
  T: "7",
  A: "4",
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
    .replace(/[^\p{L}\p{N}\s:,./|'"()-]/gu, " ")
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

/** Ubah angka yang seharusnya huruf (umum pada nama/tempat). */
export function toLetters(value: string): string {
  return value
    .split("")
    .map((c) => LETTER_LOOKALIKE[c] ?? c)
    .join("");
}

/** Bersihkan nilai field: buang sisa titik dua, tanda baca menggantung. */
export function cleanValue(value: string): string {
  return value
    .replace(/^[\s:;.\-–—|]+/, "")
    .replace(/[\s:;.\-–—|]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kemiripan sederhana (Levenshtein ternormalisasi) untuk mencocokkan label. */
export function similarity(a: string, b: string): number {
  const s = a.toUpperCase();
  const t = b.toUpperCase();
  if (s === t) return 1;
  if (!s.length || !t.length) return 0;
  const d: number[][] = Array.from({ length: s.length + 1 }, () =>
    new Array<number>(t.length + 1).fill(0),
  );
  for (let i = 0; i <= s.length; i++) d[i][0] = i;
  for (let j = 0; j <= t.length; j++) d[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return 1 - d[s.length][t.length] / Math.max(s.length, t.length);
}

/** Cocokkan sebuah nilai ke daftar opsi yang diperbolehkan. */
export function matchOption(value: string, options: readonly string[]): string | undefined {
  const clean = cleanValue(value).toUpperCase();
  if (!clean) return undefined;
  let best: { option: string; score: number } | undefined;
  for (const option of options) {
    const score = similarity(clean, option);
    if (!best || score > best.score) best = { option, score };
  }
  return best && best.score >= 0.6 ? best.option : undefined;
}
