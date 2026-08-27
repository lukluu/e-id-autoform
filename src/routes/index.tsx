import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/pages/Home";

const title = "KTP OCR Scanner — Pindai & Isi Otomatis Data KTP Terenkripsi";
const description =
  "Pindai KTP Indonesia lewat OCR, enkripsi Blowfish 64-bit, dan integrasi database Neon Serverless PostgreSQL.";

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
  ssr: false,
  component: Home,
});
