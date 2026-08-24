/**
 * Data wilayah Indonesia (provinsi -> kabupaten/kota).
 *
 * Struktur sengaja dibuat sederhana agar mudah diganti dengan data lengkap
 * dari file JSON atau API (mis. wilayah.id / BPS) tanpa mengubah komponen:
 * cukup implementasikan ulang `getProvinsiList` dan `getKabupatenKota`.
 */
export interface Wilayah {
  provinsi: string;
  kabupatenKota: string[];
}

export const wilayahIndonesia: Wilayah[] = [
  {
    provinsi: "ACEH",
    kabupatenKota: ["KOTA BANDA ACEH", "KOTA LHOKSEUMAWE", "KABUPATEN ACEH BESAR", "KABUPATEN PIDIE"],
  },
  {
    provinsi: "SUMATERA UTARA",
    kabupatenKota: ["KOTA MEDAN", "KOTA BINJAI", "KABUPATEN DELI SERDANG", "KABUPATEN KARO"],
  },
  {
    provinsi: "SUMATERA BARAT",
    kabupatenKota: ["KOTA PADANG", "KOTA BUKITTINGGI", "KABUPATEN AGAM", "KABUPATEN SOLOK"],
  },
  {
    provinsi: "RIAU",
    kabupatenKota: ["KOTA PEKANBARU", "KOTA DUMAI", "KABUPATEN KAMPAR", "KABUPATEN SIAK"],
  },
  {
    provinsi: "SUMATERA SELATAN",
    kabupatenKota: ["KOTA PALEMBANG", "KOTA LUBUKLINGGAU", "KABUPATEN BANYUASIN", "KABUPATEN OGAN ILIR"],
  },
  {
    provinsi: "LAMPUNG",
    kabupatenKota: ["KOTA BANDAR LAMPUNG", "KOTA METRO", "KABUPATEN PESAWARAN", "KABUPATEN PRINGSEWU"],
  },
  {
    provinsi: "DKI JAKARTA",
    kabupatenKota: [
      "KOTA JAKARTA PUSAT",
      "KOTA JAKARTA UTARA",
      "KOTA JAKARTA BARAT",
      "KOTA JAKARTA SELATAN",
      "KOTA JAKARTA TIMUR",
      "KABUPATEN KEPULAUAN SERIBU",
    ],
  },
  {
    provinsi: "JAWA BARAT",
    kabupatenKota: [
      "KOTA BANDUNG",
      "KOTA BEKASI",
      "KOTA BOGOR",
      "KOTA DEPOK",
      "KABUPATEN BANDUNG",
      "KABUPATEN GARUT",
    ],
  },
  {
    provinsi: "BANTEN",
    kabupatenKota: ["KOTA TANGERANG", "KOTA TANGERANG SELATAN", "KOTA SERANG", "KABUPATEN LEBAK"],
  },
  {
    provinsi: "JAWA TENGAH",
    kabupatenKota: ["KOTA SEMARANG", "KOTA SURAKARTA", "KABUPATEN BANYUMAS", "KABUPATEN KUDUS"],
  },
  {
    provinsi: "DI YOGYAKARTA",
    kabupatenKota: ["KOTA YOGYAKARTA", "KABUPATEN SLEMAN", "KABUPATEN BANTUL", "KABUPATEN GUNUNGKIDUL"],
  },
  {
    provinsi: "JAWA TIMUR",
    kabupatenKota: ["KOTA SURABAYA", "KOTA MALANG", "KABUPATEN SIDOARJO", "KABUPATEN JEMBER"],
  },
  {
    provinsi: "BALI",
    kabupatenKota: ["KOTA DENPASAR", "KABUPATEN BADUNG", "KABUPATEN GIANYAR", "KABUPATEN BULELENG"],
  },
  {
    provinsi: "NUSA TENGGARA BARAT",
    kabupatenKota: ["KOTA MATARAM", "KOTA BIMA", "KABUPATEN LOMBOK BARAT", "KABUPATEN SUMBAWA"],
  },
  {
    provinsi: "NUSA TENGGARA TIMUR",
    kabupatenKota: ["KOTA KUPANG", "KABUPATEN SIKKA", "KABUPATEN BELU", "KABUPATEN ENDE"],
  },
  {
    provinsi: "KALIMANTAN BARAT",
    kabupatenKota: ["KOTA PONTIANAK", "KOTA SINGKAWANG", "KABUPATEN SAMBAS", "KABUPATEN SANGGAU"],
  },
  {
    provinsi: "KALIMANTAN SELATAN",
    kabupatenKota: ["KOTA BANJARMASIN", "KOTA BANJARBARU", "KABUPATEN BANJAR", "KABUPATEN TANAH LAUT"],
  },
  {
    provinsi: "KALIMANTAN TIMUR",
    kabupatenKota: ["KOTA SAMARINDA", "KOTA BALIKPAPAN", "KABUPATEN KUTAI KARTANEGARA", "KABUPATEN BERAU"],
  },
  {
    provinsi: "SULAWESI SELATAN",
    kabupatenKota: [
      "KOTA MAKASSAR",
      "KOTA PAREPARE",
      "KOTA PALOPO",
      "KABUPATEN GOWA",
      "KABUPATEN MAROS",
      "KABUPATEN BONE",
    ],
  },
  {
    provinsi: "SULAWESI TENGGARA",
    kabupatenKota: [
      "KOTA KENDARI",
      "KOTA BAUBAU",
      "KABUPATEN KONAWE",
      "KABUPATEN MUNA",
      "KABUPATEN BUTON",
      "KABUPATEN WAKATOBI",
    ],
  },
  {
    provinsi: "SULAWESI TENGAH",
    kabupatenKota: ["KOTA PALU", "KABUPATEN DONGGALA", "KABUPATEN POSO", "KABUPATEN SIGI"],
  },
  {
    provinsi: "SULAWESI UTARA",
    kabupatenKota: ["KOTA MANADO", "KOTA BITUNG", "KABUPATEN MINAHASA", "KABUPATEN SANGIHE"],
  },
  {
    provinsi: "GORONTALO",
    kabupatenKota: ["KOTA GORONTALO", "KABUPATEN GORONTALO", "KABUPATEN BONE BOLANGO"],
  },
  {
    provinsi: "MALUKU",
    kabupatenKota: ["KOTA AMBON", "KOTA TUAL", "KABUPATEN MALUKU TENGAH"],
  },
  {
    provinsi: "PAPUA",
    kabupatenKota: ["KOTA JAYAPURA", "KABUPATEN JAYAPURA", "KABUPATEN BIAK NUMFOR"],
  },
];

export function getProvinsiList(): string[] {
  return wilayahIndonesia.map((w) => w.provinsi);
}

export function getKabupatenKota(provinsi: string): string[] {
  const found = wilayahIndonesia.find(
    (w) => w.provinsi.toUpperCase() === provinsi.trim().toUpperCase(),
  );
  return found ? found.kabupatenKota : [];
}

export function findProvinsiByKabupaten(kabupaten: string): string | undefined {
  const target = kabupaten.trim().toUpperCase();
  return wilayahIndonesia.find((w) =>
    w.kabupatenKota.some((k) => k.toUpperCase() === target),
  )?.provinsi;
}
