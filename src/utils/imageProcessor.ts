export interface ImageAdjustments {
  brightness: number; // 100 = normal
  contrast: number; // 100 = normal
  grayscale: boolean;
  sharpen: boolean;
}

export interface CropRect {
  /** Semua nilai dalam rasio 0..1 relatif ukuran gambar asli. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export const defaultAdjustments: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  grayscale: false,
  sharpen: false,
};

export function adjustmentsToCssFilter(a: ImageAdjustments): string {
  const parts = [`brightness(${a.brightness}%)`, `contrast(${a.contrast}%)`];
  if (a.grayscale) parts.push("grayscale(100%)");
  return parts.join(" ");
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

function applySharpen(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const idx = (py * width + px) * 4 + c;
            sum += (src.data[idx] ?? 0) * (kernel[(ky + 1) * 3 + (kx + 1)] ?? 0);
          }
        }
        out.data[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
      out.data[(y * width + x) * 4 + 3] = src.data[(y * width + x) * 4 + 3] ?? 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

export interface RenderOptions {
  rotation: number; // derajat
  crop: CropRect;
  adjustments: ImageAdjustments;
  maxWidth?: number;
}

/**
 * Render gambar sumber dengan rotasi, crop, dan penyesuaian menjadi data URL.
 * Rotasi diterapkan lebih dulu, lalu crop dihitung terhadap gambar hasil rotasi.
 */
export async function renderProcessedImage(src: string, options: RenderOptions): Promise<string> {
  const img = await loadImage(src);
  const rad = (options.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotW = Math.round(img.width * cos + img.height * sin);
  const rotH = Math.round(img.width * sin + img.height * cos);

  const rotated = document.createElement("canvas");
  rotated.width = rotW;
  rotated.height = rotH;
  const rctx = rotated.getContext("2d");
  if (!rctx) throw new Error("Canvas tidak didukung browser ini.");
  rctx.translate(rotW / 2, rotH / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  const cropX = Math.round(options.crop.x * rotW);
  const cropY = Math.round(options.crop.y * rotH);
  const cropW = Math.max(1, Math.round(options.crop.width * rotW));
  const cropH = Math.max(1, Math.round(options.crop.height * rotH));

  const scale = options.maxWidth ? Math.min(1, options.maxWidth / cropW) : 1;
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas tidak didukung browser ini.");
  octx.filter = adjustmentsToCssFilter(options.adjustments);
  octx.drawImage(rotated, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
  octx.filter = "none";
  if (options.adjustments.sharpen) applySharpen(octx, outW, outH);

  return out.toDataURL("image/png");
}

/** Pra-proses tambahan untuk OCR: upscale + brightness tinggi + kontras rendah + sharpen otomatis. */
export async function enhanceForOcr(dataUrl: string): Promise<Blob> {
  const img = await loadImage(dataUrl);

  // 1. Upscale — gambar kecil/kabur perlu resolusi lebih tinggi agar OCR akurat
  const targetWidth = Math.min(2800, Math.max(1800, img.width * 1.5));
  const scale = targetWidth / img.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung browser ini.");

  // 2. Brightness NAIK (130%) + Contrast TURUN (85%) — optimal untuk KTP Indonesia
  //    Tulisan hitam di background biru cerah perlu brightness tinggi agar kontras teks
  //    terhadap background tidak hilang. Kontras 85% cegah halation/blooming di area terang.
  ctx.filter = "brightness(130%) contrast(85%)";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  // 3. Konversi grayscale (luminosity weights) + boost kontras lokal
  for (let i = 0; i < d.length; i += 4) {
    // Luminosity: bobot standar BT.601
    const gray =
      0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0);
    // Stretch kontras: pull shadows down, highlights up
    // Formula: (v - 128) * factor + 128 | factor 1.2 = peningkatan ringan
    const stretched = Math.min(255, Math.max(0, (gray - 128) * 1.2 + 128));
    d[i] = stretched;
    d[i + 1] = stretched;
    d[i + 2] = stretched;
  }

  // 4. Unsharp Mask (sharpen kuat) — kernel pusat 6 agar tepi huruf lebih tajam
  //    Ini setara dengan "Sharpen" di Photoshop dengan amount sedang
  const sharp = new Uint8ClampedArray(d.length);
  const kernel = [0, -1, 0, -1, 6, -1, 0, -1, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = Math.min(w - 1, Math.max(0, x + kx));
          const py = Math.min(h - 1, Math.max(0, y + ky));
          sum += (d[(py * w + px) * 4] ?? 0) * (kernel[(ky + 1) * 3 + (kx + 1)] ?? 0);
        }
      }
      const sharpened = Math.min(255, Math.max(0, sum));
      const idx = (y * w + x) * 4;
      sharp[idx] = sharpened;
      sharp[idx + 1] = sharpened;
      sharp[idx + 2] = sharpened;
      sharp[idx + 3] = d[idx + 3] ?? 255;
    }
  }

  // 5. Denoise ringan: blend 70% sharp + 30% original grayscale
  //    Mengurangi noise piksel tanpa mengaburkan tepi huruf
  for (let i = 0; i < d.length; i += 4) {
    const blended = Math.round((sharp[i] ?? 0) * 0.7 + (d[i] ?? 0) * 0.3);
    d[i] = blended;
    d[i + 1] = blended;
    d[i + 2] = blended;
  }

  ctx.putImageData(imageData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal memproses gambar."))),
      "image/png",
    );
  });
}


export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar."));
    reader.readAsDataURL(file);
  });
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Format tidak didukung. Gunakan JPG, JPEG, atau PNG.";
  }
  if (file.size > 12 * 1024 * 1024) {
    return "Ukuran gambar terlalu besar (maksimal 12MB).";
  }
  return null;
}
