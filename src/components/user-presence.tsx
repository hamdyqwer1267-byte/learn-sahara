import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function UserPresence() {
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const sessionId = crypto.randomUUID();

    const updatePresence = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) {
        return;
      }

      const { error } = await supabase
        .from("user_presence")
        .upsert(
          {
            user_id: user.id,
            status: "online",
            activity: "idle",
            detail: "",
            session_id: sessionId,
            last_seen: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (error) {
        console.error("Presence update error:", error);
      }
    };

    void updatePresence();

    // تحديث حالة الطالب كل 15 ثانية
    intervalId = setInterval(() => {
      void updatePresence();
    }, 15_000);

    return () => {
      cancelled = true;

      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return null;
}
