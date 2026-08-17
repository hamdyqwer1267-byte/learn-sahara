import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isStorageRef, storagePath, uploadCourseMedia } from "@/lib/media";

type Props = {
  label: string;
  name: string;
  folder: "videos" | "pdfs";
  accept: string;
  defaultValue?: string;
  hint?: string;
};

export function MediaUploadField({ label, name, folder, accept, defaultValue = "", hint }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const ref = await uploadCourseMedia(file, folder);
      setValue(ref);
      toast.success("تم رفع الملف بنجاح");
    } catch {
      toast.error("تعذّر رفع الملف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          name={name}
          dir="ltr"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hint}
          className="flex-1"
        />
        <Button type="button" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} رفع
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      {isStorageRef(value) ? (
        <p className="text-xs text-muted-foreground">ملف مرفوع على المنصة: {storagePath(value)}</p>
      ) : null}
    </div>
  );
}
