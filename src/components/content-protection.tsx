import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

/**
 * Basic anti-piracy hardening for course/exam pages:
 * disables right click, text selection, copy, PrintScreen and devtools shortcuts.
 */
export function ContentProtection() {
  useEffect(() => {
    const block = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if (key === "printscreen") {
        e.preventDefault();
        void navigator.clipboard?.writeText("").catch(() => {});
        toast.error("التقاط الشاشة غير مسموح على المنصة");
        return;
      }
      if (e.key === "F12") {
        e.preventDefault();
        toast.error("أدوات المطور معطّلة");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        toast.error("أدوات المطور معطّلة");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p", "c", "x"].includes(key)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("keydown", onKey, true);
    document.body.classList.add("no-select");

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("keydown", onKey, true);
      document.body.classList.remove("no-select");
    };
  }, []);

  return null;
}

/** Slow-moving, low opacity red watermark with the student's name + phone. */
export function MovingWatermark({ label }: { label?: string }) {
  const { profile, user } = useAuth();
  const text = label ?? `${profile?.full_name || "طالب"} • ${profile?.phone || user?.email || ""}`;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden select-none" aria-hidden>
      <span className="animate-drift-a absolute text-[11px] font-bold whitespace-nowrap text-red-500/25">
        {text}
      </span>
      <span className="animate-drift-b absolute text-[11px] font-bold whitespace-nowrap text-red-500/20">
        {text}
      </span>
      <span className="animate-drift-c absolute text-[11px] font-bold whitespace-nowrap text-red-500/20">
        {text}
      </span>
    </div>
  );
}
