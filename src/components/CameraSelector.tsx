import { Video } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { CameraDeviceInfo } from "@/hooks/useCamera";

interface CameraSelectorProps {
  devices: CameraDeviceInfo[];
  activeDeviceId: string | null;
  onSelect: (deviceId: string) => void;
}

export function CameraSelector({ devices, activeDeviceId, onSelect }: CameraSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Video className="size-3.5" /> Pilih kamera
      </Label>
      <Select value={activeDeviceId ?? ""} onValueChange={onSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={devices.length ? "Pilih kamera" : "Tidak ada kamera"} />
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
