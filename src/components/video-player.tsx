import { useEffect, useRef, useState } from "react";

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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        لم يتم رفع فيديو لهذا الدرس بعد
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-soft">
      {isDirectFile(url) ? (
        <video
          src={url}
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="size-full"
        />
      ) : (
        <iframe
          src={toEmbedUrl(url)}
          title="مشغل الدرس"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="size-full border-0"
        />
      )}

      {/* علامة مائية ديناميكية لمنع التسريب */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="animate-watermark absolute top-4 right-4 rounded bg-black/35 px-2 py-1 text-[11px] font-bold text-white/70 select-none">
          {watermark}
        </span>
      </div>
      <span className="sr-only">{seconds} ثانية مشاهدة</span>
    </div>
  );
}
