import { Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImagePreviewProps {
  src: string | null;
  title?: string;
  caption?: string;
}

export function ImagePreview({ src, title = "Preview KTP", caption }: ImagePreviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="size-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="overflow-hidden rounded-lg bg-editor-canvas p-2">
          {src ? (
            <img
              src={src}
              alt="Hasil pemindaian KTP"
              className="w-full rounded-md object-contain"
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Belum ada gambar
            </div>
          )}
        </div>
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}
