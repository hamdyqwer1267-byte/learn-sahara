import { useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "@/lib/media";


type Props = {
  url: string;
  watermark: string;
  onHeartbeat?: (seconds: number) => void;
};

function toEmbedUrl(url: string) {
  const trimmed = url.trim();
  const yt = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return trimmed;
}

const isDirectFile = (url: string) => /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url);

export function VideoPlayer({ url, watermark, onHeartbeat }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [resolved, setResolved] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    void resolveMediaUrl(url).then((u) => {
      if (active) setResolved(u);
    });
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    timer.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 15;
        onHeartbeat?.(next);
        return next;
      });
    }, 15000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [onHeartbeat]);

  if (!resolved) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {url ? "جاري تجهيز الفيديو..." : "لم يتم رفع فيديو لهذا الدرس بعد"}
      </div>
    );
  }



  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-soft">
      {isDirectFile(resolved) || url.trim().startsWith("storage:") ? (
        <video
          src={resolved}
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="size-full"
        />
      ) : (
        <iframe
          src={toEmbedUrl(resolved)}

          title="مشغل الدرس"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="size-full border-0"
        />
      )}

    {/* Watermark الطالب - يتحرك داخل الفيديو */}
<div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
  <span className="student-watermark absolute whitespace-nowrap text-[10px] font-bold text-red-500/55">
    {watermark}
  </span>
</div>
  );
}
