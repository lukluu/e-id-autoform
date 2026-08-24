import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/pages/Home";

const title = "KTP OCR Scanner — Pindai & Isi Otomatis Data KTP";
const description =
  "Pindai KTP Indonesia lewat unggahan gambar atau kamera, ekstrak NIK, nama, dan alamat dengan OCR, lalu isi form otomatis. Diproses lokal di browser.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
  ssr: false,
});
