import { ScanLine, Camera, CameraOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  cameraAvailable: boolean;
  onReset: () => void;
}

export function Header({ cameraAvailable, onReset }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <ScanLine className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
            KTP OCR Scanner
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Pindai, ekstrak, dan isi data KTP secara otomatis
          </p>
        </div>
        <Badge variant={cameraAvailable ? "secondary" : "outline"} className="hidden gap-1.5 sm:flex">
          {cameraAvailable ? <Camera className="size-3.5" /> : <CameraOff className="size-3.5" />}
          {cameraAvailable ? "Kamera terdeteksi" : "Kamera tidak tersedia"}
        </Badge>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">Hapus Data</span>
        </Button>
      </div>
    </header>
  );
}
